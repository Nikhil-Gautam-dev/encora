import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { notify } from "../utils/toast";
import { api } from "../services/api";

export interface IChatMessage {
    id: string;
    messageId?: string;
    type: "send_message" | "receive_message";
    to: string;
    from: string;
    message: string;
    status: "sent" | "delivered" | "read";
    createdAt?: string;
}

export interface IUserTyping {
    userId: string;
    status: boolean;
}

export interface INotification {
    id: string;
    type: "contact_request" | "contact_accepted" | "contact_declined";
    from: { id: string; name: string; username: string };
    timestamp: string;
}

type WebSocketContextType = {
    socket: WebSocket | null;
    userId: string;
    sendMessage: (msg: string) => void;
    chatMessages: IChatMessage[];
    readMessage: (chats: IChatMessage[]) => void;
    activeUsers: Map<string, boolean>;
    lastSeen: Map<string, string>;
    userTyping: IUserTyping;
    notifications: INotification[];
    dismissNotification: (id: string) => void;
    clearAllNotifications: () => void;
    // keep contactRequests as derived convenience for Chats banner
    contactRequests: INotification[];
    refreshContacts: () => void;
    onContactsRefresh: number;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const NOTIF_KEY = "lb_notifications";

const loadStoredNotifications = (): INotification[] => {
    try {
        const raw = localStorage.getItem(NOTIF_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

const saveNotifications = (notifs: INotification[]) => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
};

export const WebSocketProvider: React.FC<{ userId: string; token: string; children: React.ReactNode }> = ({ userId, token, children }) => {
    const [chatMessages, setChatMessages] = useState<IChatMessage[]>([]);
    const [activeUsers, setActiveUsers] = useState<Map<string, boolean>>(new Map());
    const [lastSeen, setLastSeen] = useState<Map<string, string>>(new Map());
    const [userTyping, setUserTyping] = useState<IUserTyping>({ userId: "N/A", status: false });
    const [notifications, setNotifications] = useState<INotification[]>(loadStoredNotifications);
    const [onContactsRefresh, setOnContactsRefresh] = useState(0);
    const socketRef = useRef<WebSocket | null>(null);

    const refreshContacts = useCallback(() => {
        setOnContactsRefresh(prev => prev + 1);
    }, []);

    const addNotification = useCallback((notif: INotification) => {
        setNotifications(prev => {
            // deduplicate contact_request by sender id
            if (notif.type === "contact_request" && prev.some(n => n.type === "contact_request" && n.from.id === notif.from.id)) {
                return prev;
            }
            const updated = [...prev, notif];
            saveNotifications(updated);
            return updated;
        });
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            saveNotifications(updated);
            return updated;
        });
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications(prev => {
            // only clear non-contact_request ones (or all — user decides)
            const updated = prev.filter(n => n.type === "contact_request");
            saveNotifications(updated);
            return updated;
        });
    }, []);

    // Load pending contact requests from API on startup to survive page refresh
    useEffect(() => {
        api.get<{ requests: { id: string; name: string; username: string }[] }>("/user/contacts/requests")
            .then(res => {
                res.requests.forEach(r => {
                    addNotification({
                        id: `cr_${r.id}`,
                        type: "contact_request",
                        from: { id: r.id, name: r.name, username: r.username },
                        timestamp: new Date().toISOString()
                    });
                });
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
        let attempt = 0;
        let destroyed = false;  // set true on component unmount — stop reconnecting

        const HEARTBEAT_INTERVAL = 25_000;   // ping server every 25s
        const BASE_DELAY = 1_000;            // initial reconnect delay
        const MAX_DELAY = 30_000;            // cap reconnect delay

        const clearHeartbeat = () => {
            if (heartbeatTimer !== null) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }
        };

        const startHeartbeat = (socket: WebSocket) => {
            clearHeartbeat();
            heartbeatTimer = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "ping" }));
                }
            }, HEARTBEAT_INTERVAL);
        };

        const connect = () => {
            if (destroyed) return;

            const url = `${import.meta.env.VITE_WS_URL || "ws://localhost:8080"}?token=${token}`;
            ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                console.info(`WebSocket connected (attempt ${attempt + 1})`);
                attempt = 0;  // reset backoff on success
                ws.send(JSON.stringify({ type: "login" }));
                startHeartbeat(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case "pong":
                            // server acknowledged our ping — connection is alive
                            return;

                        case "receive_message": {
                            const chatMsg: IChatMessage = {
                                id: data.messageId || Date.now().toString(),
                                messageId: data.messageId,
                                type: "receive_message",
                                to: userId,
                                from: data.from,
                                message: data.message,
                                status: data.status || "delivered",
                                createdAt: data.createdAt
                            };
                            if (!location.href.includes("chat/" + data.from)) {
                                notify("New message", "message");
                            }
                            setChatMessages(prev => [...prev, chatMsg]);
                            return;
                        }

                        case "message_sent_ack": {
                            setChatMessages(prev => prev.map(m =>
                                m.id === data.tempId
                                    ? { ...m, messageId: data.messageId, status: data.status }
                                    : m
                            ));
                            return;
                        }

                        case "message_delivered": {
                            const ids: string[] = data.messageIds || [];
                            setChatMessages(prev => prev.map(m =>
                                m.messageId && ids.includes(m.messageId) && m.status === "sent"
                                    ? { ...m, status: "delivered" }
                                    : m
                            ));
                            return;
                        }

                        case "message_read": {
                            setChatMessages(prev => prev.map(m =>
                                m.messageId === data.messageId ? { ...m, status: "read" } : m
                            ));
                            return;
                        }

                        case "user_online":
                            setActiveUsers(prev => { const m = new Map(prev); m.set(data.userId, true); return m; });
                            return;

                        case "active_users":
                            setActiveUsers(prev => {
                                const m = new Map(prev);
                                data?.users?.forEach((id: string) => m.set(id, true));
                                return m;
                            });
                            return;

                        case "user_offline":
                            setActiveUsers(prev => { const m = new Map(prev); m.set(data.userId, false); return m; });
                            if (data.lastSeen) {
                                setLastSeen(prev => { const m = new Map(prev); m.set(data.userId, data.lastSeen); return m; });
                            }
                            return;

                        case "user_start_typing":
                            setUserTyping({ userId: data.from, status: true });
                            return;

                        case "user_stop_typing":
                            setUserTyping({ userId: data.from, status: false });
                            return;

                        case "contact_request":
                            addNotification({
                                id: `cr_${data.from.id}`,
                                type: "contact_request",
                                from: data.from,
                                timestamp: new Date().toISOString()
                            });
                            notify(`Contact request from ${data.from.name}`, "info");
                            return;

                        case "contact_accepted":
                            addNotification({
                                id: `ca_${data.by.id}_${Date.now()}`,
                                type: "contact_accepted",
                                from: data.by,
                                timestamp: new Date().toISOString()
                            });
                            notify(`${data.by.name} accepted your contact request`, "success");
                            refreshContacts();
                            return;

                        case "contact_declined":
                            addNotification({
                                id: `cd_${data.by.id}_${Date.now()}`,
                                type: "contact_declined",
                                from: data.by,
                                timestamp: new Date().toISOString()
                            });
                            notify(`${data.by.name} declined your contact request`, "info");
                            return;

                        default:
                            return;
                    }
                } catch (error) {
                    console.error("Error parsing WS message:", error);
                }
            };

            ws.onclose = (event) => {
                clearHeartbeat();
                socketRef.current = null;
                console.warn(`WebSocket closed (code ${event.code}). Reconnecting...`);
                if (!destroyed) scheduleReconnect();
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                // onclose fires after onerror, so reconnect is handled there
            };
        };

        const scheduleReconnect = () => {
            if (destroyed) return;
            const delay = Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY);
            attempt++;
            console.info(`Reconnecting in ${delay}ms (attempt ${attempt})...`);
            reconnectTimer = setTimeout(connect, delay);
        };

        connect();

        return () => {
            destroyed = true;
            clearHeartbeat();
            if (reconnectTimer !== null) clearTimeout(reconnectTimer);
            if (ws) ws.close(1000, "Component unmounted");
        };
    }, [token]);

    const sendMessage = (msg: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(msg);
        }
    };

    const readMessage = (chats: IChatMessage[]) => {
        setChatMessages(chats);
    };

    const contactRequests = notifications.filter(n => n.type === "contact_request");

    return (
        <WebSocketContext.Provider value={{
            socket: socketRef.current,
            sendMessage,
            chatMessages,
            userId,
            readMessage,
            activeUsers,
            lastSeen,
            userTyping,
            notifications,
            dismissNotification,
            clearAllNotifications,
            contactRequests,
            refreshContacts,
            onContactsRefresh
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error("useWebSocket must be used inside WebSocketProvider");
    return ctx;
};


