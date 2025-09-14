import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IClientInfo, IWebSocketMessage } from "./models/ws_client.model";
import { broadCastToAllClients, handleLoginMessage, handleSendMessage } from "./handler/ws_message.handler";
import { channel } from "./services/message_broker.service";

export const clients: Map<string, IClientInfo> = new Map();

export const createWebSocketServer = (port: number = 8080) => {
    const wss = new WebSocketServer({ port: port })

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {

        const { userId } = handleConnectionRequest(ws, req);

        if (!userId) return;

        ws.on("message", async (msg: string) => {
            try {
                const data = JSON.parse(msg);
                await handleWebSocketMessage(ws, userId, data)
            } catch (error) {
                console.error("error in handeling message: ", error)
            }
        })

        ws.on("close", async () => {
            await handleCloseConnectionRequest(ws, userId)
        })
    })
}

export const handleConnectionRequest = (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`)
    const userId = url.searchParams.get("userId")

    if (!userId || userId == "") {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'User ID is required for WebSocket connection'
        }))
        ws.close();
        return { userId: null };
    }

    if (!clients.has(userId)) {
        clients.set(userId, { ws, userId, verified: false, queue: null, consumerTag: null })
    }

    console.log("A web socket user connected successfully, userId: ", userId)

    return { userId }

}

export const handleCloseConnectionRequest = async (ws: WebSocket, userId: string) => {
    try {
        const client = clients.get(userId);

        if (client) {
            if (client.consumerTag) {
                console.info("consumer cancelled with tag: ", client.consumerTag)
                await channel.cancel(client.consumerTag)
            };

            broadCastToAllClients(JSON.stringify(
                {
                    type: "user_offline",
                    userId: userId
                }
            ))

            clients.delete(userId)
            console.info("Websocket user disconnected, userId: ",)
        }
    } catch (error) {
        console.error("error in removing closing connectiom: ", error)
    }
}


export const handleWebSocketMessage = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    if (data.type !== "login" && !clients.get(userId)?.verified) {
        ws.send(JSON.stringify(
            {
                type: 'type_error',
                message: "Unauthorized message type"
            }
        ))
        return;
    }

    switch (data.type) {
        case 'login':
            await handleLoginMessage(ws, userId, data)
            break;

        case 'send_message':
            await handleSendMessage(ws, userId, data);
            break;

        case 'type_error':
        default:
            ws.send(JSON.stringify(
                {
                    type: "type_error",
                    message: "Invalid message type"
                }
            ))
            break;
    }
}

