import amqp, { ChannelModel } from "amqplib";
import { clients } from "../client-registry";
import { MESSAGE_EXCHANGE } from "../constant";

export let channel: amqp.Channel;
export let connection: ChannelModel;

let reconnecting = false;

const BASE_DELAY = 2_000;
const MAX_DELAY = 30_000;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/** Re-assert queues for all currently connected verified clients after a reconnect */
const resubscribeClients = async () => {
    for (const [userId, client] of clients.entries()) {
        if (!client.verified) continue;
        try {
            await channel.assertExchange(MESSAGE_EXCHANGE, "direct", { durable: false });
            await channel.assertQueue(client.queue!, { durable: false });
            await channel.bindQueue(client.queue!, MESSAGE_EXCHANGE, userId);
            const tag = userId + "_" + Date.now();
            client.consumerTag = tag;
            const { WebSocket } = await import("ws");
            channel.consume(client.queue!, (msg) => {
                if (msg && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({ type: "receive_message", ...JSON.parse(msg.content.toString()) }));
                    channel.ack(msg);
                }
            }, { consumerTag: tag });
            console.info(`[RabbitMQ] Re-subscribed queue for user: ${userId}`);
        } catch (err) {
            console.error(`[RabbitMQ] Failed to re-subscribe user ${userId}:`, err);
        }
    }
};

const attachListeners = () => {
    connection.on("error", (err) => {
        console.error("[RabbitMQ] Connection error:", err.message);
    });

    connection.on("close", () => {
        console.warn("[RabbitMQ] Connection closed. Reconnecting...");
        scheduleReconnect(1);
    });
};

const scheduleReconnect = async (attempt: number) => {
    if (reconnecting) return;
    reconnecting = true;
    const delay = Math.min(BASE_DELAY * 2 ** (attempt - 1), MAX_DELAY);
    console.info(`[RabbitMQ] Reconnecting in ${delay}ms (attempt ${attempt})...`);
    await sleep(delay);
    try {
        connection = await amqp.connect(process.env.RABBIT_URL!);
        channel = await connection.createChannel();
        attachListeners();
        reconnecting = false;
        console.info("[RabbitMQ] Reconnected successfully");
        await resubscribeClients();
    } catch (err) {
        reconnecting = false;
        console.error("[RabbitMQ] Reconnect failed:", err);
        scheduleReconnect(attempt + 1);
    }
};

const createChannel = async () => {
    try {
        connection = await amqp.connect(process.env.RABBIT_URL!);
        channel = await connection.createChannel();
        attachListeners();
        return channel;
    } catch (error) {
        console.error("error in creating message broker channel", error);
        throw error;
    }
};

export { createChannel as default, createChannel };
