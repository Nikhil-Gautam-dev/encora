import { WebSocket } from "ws";
import { ConsumeMessage } from "amqplib";
import mongoose from "mongoose";

import { IWebSocketMessage, WebSocketMessageType } from "../models/ws_client.model";
import { clients } from "../server";
import { channel } from "../services/message_broker.service";
import { MESSAGE_EXCHANGE } from "../constant";
import { Message } from "../models/message.schema";
import { User } from "../models/user.schema";
import { verifyToken } from "../middleware/auth.middleware";

/** Returns the accepted contact IDs for a given user from the DB */
const getAcceptedContactIds = async (userId: string): Promise<string[]> => {
    const user = await User.findById(userId).select("contacts").lean();
    if (!user) return [];
    return user.contacts
        .filter((c: any) => c.status === "accepted")
        .map((c: any) => c.userId.toString());
};

/** Send a message only to online accepted contacts of userId */
export const broadcastToContacts = async (userId: string, msg: string) => {
    const contactIds = await getAcceptedContactIds(userId);
    for (const contactId of contactIds) {
        const client = clients.get(contactId);
        if (client?.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    }
};

export const handleLoginMessage = async (ws: WebSocket, tempId: string, data: IWebSocketMessage) => {
    try {
        const token = data.token as string | undefined;
        if (!token) {
            ws.send(JSON.stringify({ type: "auth_error" as WebSocketMessageType, message: "Token required" }));
            ws.close();
            return;
        }

        let userId: string;
        try {
            const payload = verifyToken(token);
            userId = payload.userId;
        } catch {
            ws.send(JSON.stringify({ type: "auth_error" as WebSocketMessageType, message: "Invalid or expired token" }));
            ws.close();
            return;
        }

        const pendingClient = clients.get(tempId);
        if (!pendingClient) { ws.close(); return; }
        clients.delete(tempId);

        const existing = clients.get(userId);
        if (existing?.consumerTag) {
            try { await channel.cancel(existing.consumerTag); } catch {}
        }

        const clientEntry = { ws, userId, verified: true, queue: "queue." + userId, consumerTag: userId + "_" + Date.now() };
        clients.set(userId, clientEntry);

        await channel.assertExchange(MESSAGE_EXCHANGE, "direct", { durable: false });
        await channel.assertQueue(clientEntry.queue, { durable: false });
        await channel.bindQueue(clientEntry.queue, MESSAGE_EXCHANGE, userId);

        // Mark undelivered messages as delivered and notify senders
        const undelivered = await Message.find({
            to: new mongoose.Types.ObjectId(userId),
            status: "sent"
        });

        if (undelivered.length > 0) {
            await Message.updateMany(
                { to: new mongoose.Types.ObjectId(userId), status: "sent" },
                { $set: { status: "delivered" } }
            );

            const bySender: Record<string, string[]> = {};
            for (const msg of undelivered) {
                const senderId = msg.from.toString();
                if (!bySender[senderId]) bySender[senderId] = [];
                bySender[senderId].push(msg._id.toString());
            }
            for (const [senderId, messageIds] of Object.entries(bySender)) {
                const senderClient = clients.get(senderId);
                if (senderClient?.ws.readyState === WebSocket.OPEN) {
                    senderClient.ws.send(JSON.stringify({ type: "message_delivered" as WebSocketMessageType, messageIds }));
                }
            }
        }

        console.info("consumer started with tag: ", clientEntry.consumerTag);
        channel.consume(clientEntry.queue, (msg: ConsumeMessage | null) => {
            const content = msg?.content;
            if (content && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "receive_message" as WebSocketMessageType, ...JSON.parse(content.toString()) }));
                channel.ack(msg);
            }
        }, { consumerTag: clientEntry.consumerTag });

        // Notify only accepted contacts that this user is online
        await broadcastToContacts(userId, JSON.stringify({ type: "user_online", userId }));

        // Send back only accepted contacts who are currently online
        const contactIds = await getAcceptedContactIds(userId);
        const onlineContacts = contactIds.filter(id => clients.has(id));

        ws.send(JSON.stringify({ type: "active_users", users: onlineContacts }));
        ws.send(JSON.stringify({ type: "login_success" as WebSocketMessageType, message: "user logged in successfully" }));
    } catch (error) {
        console.error("error in handling login: ", error);
        ws.send(JSON.stringify({ type: "login_error" as WebSocketMessageType, message: "Internal Server Error" }));
    }
}

export const handleSendMessage = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        const msg = data.message;
        const iv = data.iv as string | undefined;
        if (!to || !msg) return;

        // Generate ID upfront — no DB round-trip needed before acking sender
        const messageId = new mongoose.Types.ObjectId();
        const recipientOnline = clients.has(to);
        const finalStatus: "sent" | "delivered" = recipientOnline ? "delivered" : "sent";
        const now = new Date();

        // Ack sender immediately — zero DB wait
        ws.send(JSON.stringify({
            type: "message_sent_ack",
            messageId: messageId.toString(),
            tempId: data.tempId,
            status: finalStatus
        }));

        // Deliver to recipient via RabbitMQ immediately (include iv for decryption)
        channel.publish(MESSAGE_EXCHANGE, to, Buffer.from(JSON.stringify({
            messageId: messageId.toString(),
            from: userId,
            message: msg,
            iv,
            status: finalStatus,
            createdAt: now.toISOString()
        })));

        // Send delivery receipt to sender if recipient is online
        if (recipientOnline) {
            ws.send(JSON.stringify({
                type: "message_delivered" as WebSocketMessageType,
                messageIds: [messageId.toString()]
            }));
        }

        // Persist to MongoDB in the background — sender never waits for this
        Message.create({
            _id: messageId,
            from: new mongoose.Types.ObjectId(userId),
            to: new mongoose.Types.ObjectId(to),
            message: msg,
            iv,
            status: finalStatus,
            createdAt: now
        }).catch(err => console.error("[persist] Failed to save message:", err));

    } catch (error) {
        console.error("error in handling send_message: ", error);
        ws.send(JSON.stringify({
            type: "send_message_error" as WebSocketMessageType,
            message: "Internal Server Error"
        }));
    }
}

export const handleMessageRead = async (_ws: WebSocket, _userId: string, data: IWebSocketMessage) => {
    try {
        const { messageId } = data;
        if (!messageId) return;

        // Fetch only the `from` field — don't need the rest of the document
        const message = await Message.findById(messageId).select("from").lean();
        if (!message) return;

        // Update status in background — no need to block on this
        Message.updateOne({ _id: messageId }, { $set: { status: "read" } })
            .catch(err => console.error("[persist] Failed to update read status:", err));

        const senderId = message.from.toString();
        const senderClient = clients.get(senderId);
        if (senderClient?.ws.readyState === WebSocket.OPEN) {
            senderClient.ws.send(JSON.stringify({
                type: "message_read" as WebSocketMessageType,
                messageId
            }));
        }
    } catch (error) {
        console.error("error in handleMessageRead: ", error);
    }
}


export const handleUserStartTyping= async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        if (to) {
            const client = clients.get(to);
            if (client && client.ws.readyState == WebSocket.OPEN) {
                client.ws.send(JSON.stringify({ type: "user_start_typing", from: userId }))
                return;
            }
        }
    } catch (error) {
        console.error("error in handling user_start_typing: ", error);
        ws.send(JSON.stringify({
            type: "user_typing_error" as WebSocketMessageType,
            message: "Internal Server Error"
        }))
        return;
    }
}

export const handleUserStopTyping = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        if (to) {
            const client = clients.get(to);
            if (client && client.ws.readyState == WebSocket.OPEN) {
                client.ws.send(JSON.stringify({ type: "user_stop_typing", from: userId }))
                return;
            }
        }
    } catch (error) {
        console.error("error in handling user_stop_typing: ", error);
        ws.send(JSON.stringify({
            type: "user_typing_error" as WebSocketMessageType,
            message: "Internal Server Error"
        }))
        return;
    }
}