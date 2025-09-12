"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_dotenv = __toESM(require("dotenv"));

// src/services/message_broker.service.ts
var import_amqplib = __toESM(require("amqplib"));
var channel;
var createChannel = async () => {
  try {
    const connection = await import_amqplib.default.connect(process.env.RABBIT_URL);
    channel = await connection.createChannel();
    return channel;
  } catch (error) {
    console.error("error in creating message broker channel", error);
    throw error;
  }
};
var message_broker_service_default = createChannel;

// src/server.ts
var import_ws2 = require("ws");

// src/handler/ws_message.handler.ts
var import_ws = require("ws");

// src/constant.ts
var MESSAGE_EXCHANGE = "live_bridge";

// src/handler/ws_message.handler.ts
var handleLoginMessage = async (ws, userId, data) => {
  try {
    const client = clients.get(userId);
    if (client) {
      client.verified = true;
      client.queue = "queue." + userId;
      await channel.assertExchange(MESSAGE_EXCHANGE, "direct", { durable: false });
      await channel.assertQueue(client.queue);
      await channel.bindQueue(client.queue, MESSAGE_EXCHANGE, userId);
      channel.prefetch(2);
      channel.consume(
        client.queue,
        (msg) => {
          const content = msg?.content;
          if (content && ws.readyState === import_ws.WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "receive_message",
              ...JSON.parse(content.toString())
            }));
            channel.ack(msg);
          }
        },
        {
          consumerTag: client.userId
        }
      );
      ws.send(
        JSON.stringify(
          {
            type: "login_success",
            message: "user logged in successfully"
          }
        )
      );
      return;
    }
    throw new Error("user not in clients");
  } catch (error) {
    console.error("error in handling login: ", error);
    ws.send(
      JSON.stringify(
        {
          type: "login_error",
          message: "Internal Server Error"
        }
      )
    );
    return;
  }
};
var handleSendMessage = async (ws, userId, data) => {
  try {
    const to = data.to;
    const msg = data.message;
    if (to && msg) {
      channel.publish(MESSAGE_EXCHANGE, to, Buffer.from(JSON.stringify(
        {
          from: userId,
          message: msg
        }
      )));
    }
  } catch (error) {
    console.error("error in handling send_message: ", error);
    ws.send(
      JSON.stringify(
        {
          type: "send_message_error",
          message: "Internal Server Error"
        }
      )
    );
    return;
  }
};

// src/server.ts
var clients = /* @__PURE__ */ new Map();
var createWebSocketServer = (port = 8080) => {
  const wss = new import_ws2.WebSocketServer({ port });
  wss.on("connection", (ws, req) => {
    console.info("A web socket user connected!!");
    const { userId } = handleConnectionRequest(ws, req);
    if (!userId) return;
    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);
        await handleWebSocketMessage(ws, userId, data);
      } catch (error) {
        console.error("error in handeling message: ", error);
      }
    });
    ws.on("close", async () => {
      handleCloseConnectionRequest(ws, userId);
    });
  });
};
var handleConnectionRequest = (ws, req) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const userId = url.searchParams.get("userId");
  if (!userId || userId == "") {
    ws.send(JSON.stringify({
      type: "error",
      message: "User ID is required for WebSocket connection"
    }));
    ws.close();
    return { userId: null };
  }
  if (!clients.has(userId)) {
    clients.set(userId, { ws, userId, verified: false, queue: null });
  }
  return { userId };
};
var handleCloseConnectionRequest = (ws, userId) => {
  try {
    const client = clients.get(userId);
    if (client) {
      channel.cancel(client.userId);
      clients.delete(userId);
    }
  } catch (error) {
    console.error("error in removing closing connectiom: ", error);
  }
};
var handleWebSocketMessage = async (ws, userId, data) => {
  if (data.type !== "login" && !clients.get(userId)?.verified) {
    ws.send(JSON.stringify(
      {
        type: "type_error",
        message: "Unauthorized message type"
      }
    ));
    return;
  }
  switch (data.type) {
    case "login":
      await handleLoginMessage(ws, userId, data);
      break;
    case "send_message":
      await handleSendMessage(ws, userId, data);
      break;
    case "type_error":
    default:
      ws.send(JSON.stringify(
        {
          type: "type_error",
          message: "Invalid message type"
        }
      ));
      break;
  }
};

// src/index.ts
var import_process = require("process");
import_dotenv.default.config();
var PORT = Number(process.env.PORT || 3e3);
message_broker_service_default().then(
  () => {
    createWebSocketServer(PORT);
    console.log(`WebSocket server running on port ${PORT}`);
  }
).catch((e) => {
  console.error("Error starting server:", e);
  (0, import_process.exit)(1);
});
//# sourceMappingURL=index.js.map