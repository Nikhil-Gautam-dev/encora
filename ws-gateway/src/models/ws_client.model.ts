import { WebSocket } from "ws";

export interface IClientInfo {
    ws: WebSocket;
    userId: string;
    verified: boolean;
    queue: string | null;
}

export interface IWebSocketMessage {
    type: WebSocketMessageType;
    [key: string]: any
}

export type WebSocketMessageType =
    'login' |
    'login_error' |
    'type_error' |
    'send_message' |
    'receive_message' |
    'send_message_error'
    ;