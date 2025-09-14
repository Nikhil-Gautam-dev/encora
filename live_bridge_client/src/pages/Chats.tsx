import { Link } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";

const dummyChats = [
    { id: 1, name: "Vickey", userId: "vik_123", lastMsg: "Hey, how are you?", readCount: 0, isActive: false },
    { id: 2, name: "Nikhil", userId: "nik_123", lastMsg: "Hey, how are you?", readCount: 0, isActive: false },
    { id: 3, name: "Rohit", userId: "rohit_123", lastMsg: "Hey, how are you?", readCount: 0, isActive: false },
];

export default function Chats() {
    const { userId, chatMessages, activeUsers } = useWebSocket();
    const [chats, setChats] = useState<any>([]);

    useEffect(() => {
        setChats(
            dummyChats
                .filter(chat => chat.userId !== userId)
                .map(msg => {
                    return {
                        ...msg,
                        readCount: chatMessages.filter(chat => chat.from === msg.userId && chat.read === false).length,
                        isActive: activeUsers.get(msg.userId) ?? false,
                    };
                })
        );
    }, [chatMessages, activeUsers]);

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Chats</h2>
            <div className="space-y-3">
                {chats.map((chat: any) => (
                    <Link
                        key={chat.id}
                        to={`/chat/${chat.userId}`}
                        className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                        {/* Avatar */}
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-800 font-semibold text-lg">
                                {chat.name[0]}
                            </div>
                            {/* Active Status Dot */}
                            <span
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${chat.isActive ? "bg-green-500" : "bg-gray-400"
                                    }`}
                            ></span>
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-900 truncate">{chat.name}</p>
                                {chat.readCount > 0 && (
                                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                                        {chat.readCount}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{chat.lastMsg}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
