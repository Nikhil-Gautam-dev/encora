import { WebSocket } from "ws";
import { ConsumeMessage } from "amqplib";

import { IWebSocketMessage, WebSocketMessageType } from "../models/ws_client.model";
import { clients } from "../server";
import { channel } from "../services/message_broker.service";
import { MESSAGE_EXCHANGE } from "../constant";

export const handleLoginMessage = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const client = clients.get(userId);
        if (client) {
            client.verified = true;
            client.queue = "queue." + userId;
            client.consumerTag = userId + "_" + Date.now().toString();

            await channel.assertExchange(MESSAGE_EXCHANGE, "direct", { durable: false });
            await channel.assertQueue(client.queue, { durable: false })

            await channel.bindQueue(client.queue, MESSAGE_EXCHANGE, userId);


            console.info("consumer started with tag: ", client.consumerTag)
            channel.consume(client.queue, (msg: ConsumeMessage | null) => {
                const content = msg?.content;
                if (content && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "receive_message" as WebSocketMessageType,
                        id: new Date().getTime().toString(),
                        ...JSON.parse(content.toString())
                    }));

                    channel.ack(msg)
                }
            },
                {
                    consumerTag: client.consumerTag
                }
            )

            broadCastToAllClients(JSON.stringify(
                {
                    type: "user_online",
                    userId: userId
                }
            ))

            ws.send(JSON.stringify(
                {
                    type: "active_users",
                    users: Array.from(clients.keys()).filter(id => id != userId)
                }
            ))

            ws.send(
                JSON.stringify(
                    {
                        type: "login_success",
                        message: "user logged in successfully"
                    }
                )
            )
            return;
        }
        throw new Error("user not in clients")
    } catch (error) {
        console.error("error in handling login: ", error);
        ws.send(
            JSON.stringify(
                {
                    type: "login_error" as WebSocketMessageType,
                    message: "Internal Server Error"
                }
            )
        )
        return;
    }
}

export const handleSendMessage = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        const msg = data.message

        if (to && msg) {
            // TODO: send message to queue
            channel.publish(MESSAGE_EXCHANGE, to, Buffer.from(JSON.stringify(
                {
                    from: userId,
                    message: msg
                }
            )))
        }
    } catch (error) {
        console.error("error in handling send_message: ", error);
        ws.send(
            JSON.stringify(
                {
                    type: "send_message_error" as WebSocketMessageType,
                    message: "Internal Server Error"
                }
            )
        )
        return;
    }
}

export const broadCastToAllClients = (msg: string) => {
    clients.forEach(client => {
        const clientWS = client.ws;

        if (clientWS && clientWS.readyState == WebSocket.OPEN) {
            clientWS.send(msg);
        }
    })
}

export const handleUserStartTyping = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        if (to) {
            const client = clients.get(to);

            if (client && client.ws.readyState == WebSocket.OPEN) {
                client.ws.send(JSON.stringify(
                    {
                        type: "user_start_typing",
                        to: userId
                    }
                ))
                return;
            }
        }
    } catch (error) {
        console.error("error in handling login: ", error);
        ws.send(
            JSON.stringify(
                {
                    type: "user_typing_error" as WebSocketMessageType,
                    message: "Internal Server Error"
                }
            )
        )
        return;
    }
}
export const handleUserStopTyping = async (ws: WebSocket, userId: string, data: IWebSocketMessage) => {
    try {
        const to = data.to;
        if (to) {
            const client = clients.get(to);

            if (client && client.ws.readyState == WebSocket.OPEN) {
                client.ws.send(JSON.stringify(
                    {
                        type: "user_stop_typing",
                        to: userId
                    }
                ))
                return;
            }
        }
    } catch (error) {
        console.error("error in handling login: ", error);
        ws.send(
            JSON.stringify(
                {
                    type: "user_typing_error" as WebSocketMessageType,
                    message: "Internal Server Error"
                }
            )
        )
        return;
    }
}