import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState } from "react";

export default function ChatScreen() {

    const { sendMessage, messages } = useWebSocket();
    const [message, setMessage] = useState<string>("");
    const [showMessages, setShowMessages] = useState<any[]>([]);
    const { userId } = useParams();


    useEffect(() => {

        setShowMessages(prev => [...prev, ...messages.filter(msg => msg.type == "receive_message" && msg.from == userId)]);

    }, [messages])

    const handleSendButton = () => {
        console.log("message: ", message)

        const newMessage =
        {
            "type": "send_message",
            "to": userId,
            "message": message
        }

        sendMessage(JSON.stringify(newMessage))

        setShowMessages(prev => [...prev, newMessage])
    }


    return (
        <div className="flex h-screen flex-col">
            <div className="flex items-center justify-between bg-green-600 p-4 text-white">
                <h2 className="text-lg font-semibold">Chat with User {userId}</h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-100 p-4">
                {
                    showMessages.map(msg => <>
                        {msg.type == "send_message" ?
                            <>
                                <div className="ml-auto max-w-xs rounded-lg bg-green-500 p-2 text-white shadow">
                                    {msg.message}
                                </div>
                            </>
                            :
                            <>
                                {msg.type == "receive_message" ? <>
                                    <div className="max-w-xs rounded-lg bg-white p-2 shadow">
                                        {msg.message}
                                    </div>

                                </> : <></>}

                            </>
                        } </>

                    )
                }


            </div>

            <div className="flex gap-2 border-t p-3">
                <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.currentTarget.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border px-4 py-2 outline-none focus:ring focus:ring-green-500"
                />
                <button
                    onClick={handleSendButton}
                    className="rounded-full bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                    Send
                </button>
            </div>
        </div>
    );
}
