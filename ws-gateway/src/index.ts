import dotenv from "dotenv";
dotenv.config();

import { createChannel, connection as rabbitConnection } from "./services/message_broker.service";
import connectDB from "./services/database.service";
import { createWebSocketServer, clients, wss } from "./server";
import app from "./app";
import { exit } from "process";
import mongoose from "mongoose";
import { Server } from "http";

const WS_PORT = Number(process.env.PORT || 8080);
const HTTP_PORT = Number(process.env.HTTP_PORT || 3001);

let httpServer: Server;

Promise.all([createChannel(), connectDB()])
    .then(() => {
        createWebSocketServer(WS_PORT);
        console.log(`WebSocket server running on port ${WS_PORT}`);

        httpServer = app.listen(HTTP_PORT, () => {
            console.log(`HTTP server running on port ${HTTP_PORT}`);
        });
    })
    .catch(e => {
        console.error("Error starting server:", e);
        exit(1);
    });

const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    // Close all active WebSocket connections
    for (const [userId, client] of clients.entries()) {
        try {
            client.ws.close(1001, "Server shutting down");
        } catch {
            // ignore errors on individual client close
        }
        clients.delete(userId);
    }

    // Close the WebSocket server
    await new Promise<void>((resolve) => {
        wss.close(() => {
            console.log("WebSocket server closed");
            resolve();
        });
    });

    // Stop accepting new HTTP connections
    await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
            if (err) reject(err);
            else {
                console.log("HTTP server closed");
                resolve();
            }
        });
    });

    // Close RabbitMQ connection
    try {
        await (rabbitConnection as any)?.close();
        console.log("RabbitMQ connection closed");
    } catch {
        // ignore
    }

    // Disconnect MongoDB
    try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    } catch {
        // ignore
    }

    console.log("Shutdown complete");
    exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

