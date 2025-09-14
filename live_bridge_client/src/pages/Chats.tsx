import { Link } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";

const dummyChats = [
    { id: 1, name: "Vickey", userId: "vik_123", lastMsg: "Hey, how are you?" },
    { id: 2, name: "Nikhil", userId: "nik_123", lastMsg: "Hey, how are you?" },
];

export default function Chats() {
    const { userId, chatMessages } = useWebSocket();
    const [readCount, setReadCount] = useState(0);

    const [chats, setChats] = useState<any>([]);

    useEffect(() => {
        setReadCount(chatMessages.filter(msg => !msg.read).length)
        setChats(dummyChats.filter(chat => chat.userId !== userId))
    }, [chatMessages])

    return (
        <div className="p-4">
            <div>read count: {readCount}</div>
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
                </Link>
            ))}
        </div>
    );
}
