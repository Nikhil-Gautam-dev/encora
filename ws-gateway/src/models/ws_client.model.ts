import { WebSocket } from "ws";

export interface IClientInfo {
    ws: WebSocket;
    userId: string;
    verified: boolean;
    queue: string | null;
    consumerTag: string | null
}

export interface IWebSocketMessage {
    type: WebSocketMessageType;
    [key: string]: any
}

export type WebSocketMessageType =
    'login' |
    'login_success' |
    'login_error' |
    'auth_error' |
    'type_error' |
    'ping' |
    'pong' |
    'send_message' |
    'receive_message' |
    'send_message_error' |
    'user_start_typing' |
    'user_stop_typing' |
    'message_delivered' |
    'message_read' |
    'message_sent_ack' |
    'contact_request' |
    'contact_accepted' |
    'contact_declined'
    ;