// src/context/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { notify } from "../utils/toast";

export interface IChatMessage {
    id: string;
    type: string;
    to: string;
    from: string;
    message: string;
    read: boolean;
}

export interface IUserTyping {
    userId: string,
    status: boolean
}

type WebSocketContextType = {
    socket: WebSocket | null;
    userId: string;
    sendMessage: (msg: string) => void;
    chatMessages: IChatMessage[],
    messages: any[];
    readMessage: (chats: IChatMessage[]) => void;
    activeUsers: Map<string, boolean>;
    userTyping: IUserTyping;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ userId: string, children: React.ReactNode }> = ({ userId, children }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<IChatMessage[]>([]);
    const [activeUsers, setActiveUsers] = useState<Map<string, boolean>>(new Map());
    const [userTyping, setUserTyping] = useState<IUserTyping>({ userId: "N/A", status: false })
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080?userId=" + userId);

        ws.onopen = () => {
            console.info("Connected to WebSocket");
            ws.send(JSON.stringify(
                {
                    type: "login"
                }
            ));
        };

        ws.onmessage = (event) => {
            console.log("event data: ", event.data)

            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case "receive_message":
                        const chatMessage: IChatMessage = {
                            id: data.id,
                            type: "receive_message",
                            to: data.to,
                            from: data?.from ?? "",
                            message: data.message,
                            read: false
                        }
                        const url = location.href;
                        if (!url.includes("chat/" + data.from)) {
                            notify("new message from " + data.from, "message")
                        }
                        setChatMessages(prev => [...prev, chatMessage])
                        return;

                    case "user_online":
                        setActiveUsers(prev => {
                            const newMap = new Map(prev);
                            newMap.set(data.userId, true);
                            return newMap;
                        })
                        return;

                    case "active_users":
                        setActiveUsers(prev => {
                            const newMap = new Map(prev);
                            data?.users?.forEach((id: string) => {
                                newMap.set(id, true,)
                            })
                            return newMap;
                        })
                        return;

                    case "user_offline":
                        setActiveUsers(prev => {
                            const newMap = new Map(prev);
                            newMap.set(data.userId, false);
                            return newMap;
                        })
                        return;

                    case "user_start_typing":
                        setUserTyping({ userId: data.to, status: true })
                        return;

                    case "user_stop_typing":
                        setUserTyping({ userId: data.to, status: false })
                        return;

                    default:
                        setMessages((prev) => [...prev, JSON.parse(event.data)]);
                        return;
                }

            } catch (error) {
                console.error("error in parsing data: ", error)
            }
        };

        ws.onclose = () => console.info("WebSocket disconnected");
        ws.onerror = (err) => console.error("WebSocket error:", err);

        socketRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const sendMessage = (msg: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(msg);
        }
    };

    const readMessage = (chat: IChatMessage[]) => {
        setChatMessages(chat);
    }

    return (
        <WebSocketContext.Provider value={{ socket: socketRef.current, sendMessage, messages, chatMessages, userId, readMessage, activeUsers, userTyping }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error("useWebSocket must be used inside WebSocketProvider");
    return ctx;
};
