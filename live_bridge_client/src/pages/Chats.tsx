import { Link } from "react-router-dom";

const dummyChats = [
    { id: 1, name: "vickey", userId: "vik_123", lastMsg: "Hey, how are you?" },
];

export default function Chats() {


    return (
        <div className="p-4">
            {dummyChats.map((chat) => (
                <Link
                    key={chat.id}
                    to={`/chat/${"vik_123"}`}
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
