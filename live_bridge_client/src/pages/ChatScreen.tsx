import { useParams } from "react-router-dom";

export default function ChatScreen() {
    const { id } = useParams();

    return (
        <div className="flex h-screen flex-col">
            <div className="flex items-center justify-between bg-green-600 p-4 text-white">
                <h2 className="text-lg font-semibold">Chat with User {id}</h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-100 p-4">
                <div className="max-w-xs rounded-lg bg-white p-2 shadow">
                    Hi there 👋
                </div>
                <div className="ml-auto max-w-xs rounded-lg bg-green-500 p-2 text-white shadow">
                    Hello!
                </div>
            </div>

            <div className="flex gap-2 border-t p-3">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border px-4 py-2 outline-none focus:ring focus:ring-green-500"
                />
                <button className="rounded-full bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                    Send
                </button>
            </div>
        </div>
    );
}
