// src/context/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export interface IChatMessages {
    type: string;
    to: string;
    from: string;
    message: string;
}

type WebSocketContextType = {
    socket: WebSocket | null;
    sendMessage: (msg: string) => void;
    chatMessages: IChatMessages[],
    messages: any[];
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ userId: string, children: React.ReactNode }> = ({ userId, children }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<IChatMessages[]>([]);
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

                if (data.type == "receive_message") {
                    setChatMessages(prev => [...prev, data])
                    return;
                }
                setMessages((prev) => [...prev, JSON.parse(event.data)]);

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

    return (
        <WebSocketContext.Provider value={{ socket: socketRef.current, sendMessage, messages, chatMessages }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error("useWebSocket must be used inside WebSocketProvider");
    return ctx;
};
