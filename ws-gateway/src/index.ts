import dotenv from "dotenv";
dotenv.config();

import createChannel from "./services/message_broker.service";
import { createWebSocketServer } from "./server";
import { exit } from "process";

const PORT = Number(process.env.PORT || 3000);

createChannel().then(
    () => {
        createWebSocketServer(PORT);
        console.log(`WebSocket server running on port ${PORT}`);
    }
)
    .catch(e => {
        console.error("Error starting server:", e);
        exit(1);
    })

