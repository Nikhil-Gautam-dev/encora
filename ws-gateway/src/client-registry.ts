import { IClientInfo } from "./models/ws_client.model";

/** Shared map of connected WebSocket clients — imported by both server.ts and message_broker.service.ts */
export const clients: Map<string, IClientInfo> = new Map();
