import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IClientInfo, IWebSocketMessage } from "./models/ws_client.model";
import { broadcastToContacts, handleLoginMessage, handleSendMessage, handleUserStartTyping, handleUserStopTyping, handleMessageRead } from "./handler/ws_message.handler";
import { channel } from "./services/message_broker.service";
import { User } from "./models/user.schema";

export const clients: Map<string, IClientInfo> = new Map();

export let wss: WebSocketServer;

const PING_INTERVAL_MS = 30_000;  // send ping every 30s
const PONG_TIMEOUT_MS  = 10_000;  // terminate if no pong within 10s

export const createWebSocketServer = (port: number = 8080) => {
    wss = new WebSocketServer({ port });

    // Server-side heartbeat: ping every client and terminate those that go silent
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws: any) => {
            if (ws.isAlive === false) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, PING_INTERVAL_MS);

    wss.on("close", () => clearInterval(heartbeatInterval));

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        const extWs = ws as any;
        extWs.isAlive = true;

        // Mark alive on every pong received from client
        ws.on("pong", () => { extWs.isAlive = true; });

        const { userId } = handleConnectionRequest(ws, req);
        if (!userId) return;

        ws.on("message", async (msg: string) => {
            try {
                const data = JSON.parse(msg);
                // Handle client-originated ping (application-level heartbeat)
                if (data.type === "ping") {
                    ws.send(JSON.stringify({ type: "pong" }));
                    return;
                }
                await handleWebSocketMessage(ws, userId, data);
            } catch (error) {
                console.error("error handling message:", error);
            }
        });

        ws.on("close", async () => {
            await handleCloseConnectionRequest(ws, userId);
        });
    });
};

export const handleConnectionRequest = (ws: WebSocket, _req: IncomingMessage) => {
    // Accept the raw connection — auth happens when client sends { type: "login", token }
    // This avoids exposing the JWT in the URL (server logs, browser history, etc.)
    const tempId = `pending_${Date.now()}_${Math.random()}`;
    clients.set(tempId, { ws, userId: tempId, verified: false, queue: null, consumerTag: null });
    console.log("WebSocket connection accepted (pending auth), tempId:", tempId);
    return { userId: tempId };
}

export const handleCloseConnectionRequest = async (_: WebSocket, userId: string) => {
    try {
        const client = clients.get(userId);

        if (client) {
            if (client.consumerTag) {
                console.info("consumer cancelled with tag: ", client.consumerTag)
                await channel.cancel(client.consumerTag)
            };

            clients.delete(userId);

            if (!userId.startsWith("pending_")) {
                const lastSeen = new Date();
                await User.findByIdAndUpdate(userId, { lastSeen });

                // Only notify accepted contacts that this user went offline
                await broadcastToContacts(userId, JSON.stringify({
                    type: "user_offline",
                    userId,
                    lastSeen: lastSeen.toISOString()
                }));
            }

            console.info("Websocket user disconnected, userId:", userId)
        }
    } catch (error) {
        console.error("error in removing closing connection: ", error)
    }
}


export const handleWebSocketMessage = async (ws: WebSocket, tempId: string, data: IWebSocketMessage) => {
    // For login, pass tempId — handler will re-key to real userId after token verification
    if (data.type === "login") {
        await handleLoginMessage(ws, tempId, data);
        return;
    }

    // For all other messages, find the authenticated client by ws reference
    const authenticatedEntry = Array.from(clients.values()).find(c => c.ws === ws && c.verified);
    if (!authenticatedEntry) {
        ws.send(JSON.stringify({ type: 'type_error', message: "Unauthorized message type" }));
        return;
    }

    const userId = authenticatedEntry.userId;

    switch (data.type) {
        case 'send_message':
            await handleSendMessage(ws, userId, data);
            break;

        case 'user_start_typing':
            await handleUserStartTyping(ws, userId, data);
            break;

        case 'user_stop_typing':
            await handleUserStopTyping(ws, userId, data);
            break;

        case 'message_read':
            await handleMessageRead(ws, userId, data);
            break;

        case 'type_error':
        default:
            ws.send(JSON.stringify({ type: "type_error", message: "Invalid message type" }));
            break;
    }
}

