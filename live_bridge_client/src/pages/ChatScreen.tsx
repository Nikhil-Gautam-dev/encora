import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useRef, useState } from "react";

export default function ChatScreen() {
    const { sendMessage, chatMessages, readMessage } = useWebSocket();
    const [inputMessage, setInputMessage] = useState<string>("");
    const [showMessages, setShowMessages] = useState<any[]>([]);
    const { userId } = useParams();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Append only *new* incoming messages
    useEffect(() => {
        const incoming = chatMessages.filter(msg => msg.from === userId);
        setShowMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOnes = incoming.filter((m: any) => !existingIds.has(m.id));
            return [...prev, ...newOnes];
        });

        const readMessages = chatMessages.map((msg) => {
            return {
                ...msg,
                ...(msg.from == userId && { read: true })
            }
        })


        readMessage(readMessages)

    }, [chatMessages, userId]);

    // Scroll to latest
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [showMessages]);

    const handleSendButton = () => {
        if (!inputMessage.trim()) return;

        const newMessage = {
            id: Date.now().toString(), // unique ID for deduplication
            type: "send_message",
            to: userId,
            message: inputMessage,
        };

        // Send to server
        sendMessage(JSON.stringify(newMessage));

        // Append locally
        setShowMessages(prev => [...prev, newMessage]);

        setInputMessage("");
    };

    return (
        <div className="flex h-screen flex-col">
            <div className="flex items-center justify-between bg-green-600 p-4 text-white">
                <h2 className="text-lg font-semibold">Chat with User {userId}</h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-100 p-4">
                {showMessages.map((msg, index) => (
                    <div key={msg.id || index}>
                        {msg.type === "send_message" ? (
                            <div className="ml-auto max-w-xs rounded-lg bg-green-500 p-2 text-white shadow">
                                {msg.message}
                            </div>
                        ) : (
                            <div className="max-w-xs rounded-lg bg-white p-2 shadow">
                                {msg.message}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2 border-t p-3">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.currentTarget.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border px-4 py-2 outline-none focus:ring focus:ring-green-500"
                />
                <button
                    onClick={handleSendButton}
                    className="rounded-full bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
