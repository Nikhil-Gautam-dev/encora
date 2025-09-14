import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useRef, useState } from "react";

export default function ChatScreen() {
    const { sendMessage, chatMessages, readMessage, activeUsers } = useWebSocket();
    const [inputMessage, setInputMessage] = useState<string>("");
    const [showMessages, setShowMessages] = useState<any[]>([]);
    const [isUserActive, setIsUserActive] = useState<boolean>(false);
    const { userId } = useParams();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Append only *new* incoming messages
    useEffect(() => {
        if (!userId) return;

        const incoming = chatMessages.filter(msg => msg.from === userId);

        setShowMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOnes = incoming.filter((m: any) => !existingIds.has(m.id));
            if (newOnes.length === 0) return prev; // prevent unnecessary state updates
            return [...prev, ...newOnes];
        });

        // Mark messages as read once
        const unread = chatMessages.filter(msg => msg.from === userId && !msg.read);
        if (unread.length > 0) {
            const updated = chatMessages.map((msg) =>
                msg.from === userId ? { ...msg, read: true } : msg
            );
            readMessage(updated);
        }

        setIsUserActive(activeUsers.get(userId) ?? false);

    }, [chatMessages, userId, activeUsers, readMessage]);

    // Scroll to latest
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [showMessages]);

    const handleSendButton = () => {
        if (!inputMessage.trim() || !userId) return;

        const newMessage = {
            id: Date.now().toString(),
            type: "send_message",
            to: userId,
            message: inputMessage,
        };

        sendMessage(JSON.stringify(newMessage));
        setShowMessages(prev => [...prev, newMessage]);
        setInputMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendButton();
        }
    };

    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 bg-green-600 p-4 text-white shadow">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-green-600 font-bold">
                    {userId?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">User {userId}</h2>
                    <p className="text-sm text-gray-200">
                        {isUserActive ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-100 p-4">
                {showMessages.map((msg, index) => (
                    <div key={msg.id || index} className="flex">
                        {msg.type === "send_message" ? (
                            <div className="ml-auto max-w-xs rounded-2xl bg-green-500 px-4 py-2 text-white shadow">
                                {msg.message}
                            </div>
                        ) : (
                            <div className="mr-auto max-w-xs rounded-2xl bg-white px-4 py-2 shadow">
                                {msg.message}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 border-t bg-white p-3">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border px-4 py-2 outline-none focus:ring focus:ring-green-500"
                />
                <button
                    onClick={handleSendButton}
                    className="rounded-full bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
