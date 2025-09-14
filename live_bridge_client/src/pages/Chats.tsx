import { Link } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";

const dummyChats = [
    { id: 1, name: "Vickey", userId: "vik_123", lastMsg: "Hey, how are you?", readCount: 0 },
    { id: 2, name: "Nikhil", userId: "nik_123", lastMsg: "Hey, how are you?", readCount: 0 },
    { id: 3, name: "rohit", userId: "rohit_123", lastMsg: "Hey, how are you?", readCount: 0 },
];

export default function Chats() {
    const { userId, chatMessages } = useWebSocket();

    const [chats, setChats] = useState<any>([]);

    useEffect(() => {
        setChats(dummyChats
            .filter(chat => chat.userId !== userId)
            .map(msg => {
                return {
                    ...msg,
                    readCount: chatMessages.filter(chat => chat.from === msg.userId && chat.read == false).length
                }
            }))
    }, [chatMessages])

    return (
        <div className="p-4">
            {chats.map((chat: any) => (
                <Link
                    key={chat.id}
                    to={`/chat/${chat.userId}`}
                    className="mb-3 flex items-center gap-3 rounded-lg bg-white p-3 shadow hover:bg-gray-50"
                >
                    <div className="h-10 w-10 rounded-full bg-green-500 text-center text-white flex items-center justify-center">
                        {chat.name[0]}
                    </div>
                    <div>
                        <p className="font-semibold">{chat.name}</p>
                        <p className="text-sm text-gray-500">{chat.lastMsg}</p>
                    </div>
                    <div>
                        {chat.readCount}
                    </div>
                </Link>
            ))}
        </div>
    );
}
