import { Link } from "react-router-dom";

const dummyChats = [
    { id: 1, name: "Alice", lastMsg: "Hey, how are you?" },
    { id: 2, name: "Bob", lastMsg: "See you tomorrow!" },
    { id: 3, name: "Charlie", lastMsg: "Let’s catch up soon." },
];

export default function Chats() {
    return (
        <div className="p-4">
            {dummyChats.map((chat) => (
                <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
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
