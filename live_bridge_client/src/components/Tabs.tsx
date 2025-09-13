import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Tabs() {

    const [, setMessages] = useState<string[]>([]);
    const [, setSocket] = useState<WebSocket | null>(null);


    useEffect(() => {
        // Connect to WebSocket server
        const ws = new WebSocket("ws://localhost:8080?userId=nik_123");

        ws.onopen = () => {
            console.info("Connected to WebSocket");
        };

        ws.onmessage = (event) => {
            console.info("Message received:", event.data);
            setMessages((prev) => [...prev, event.data]);
        };

        ws.onclose = () => console.info("Disconnected from WebSocket");
        ws.onerror = (err) => console.error("WebSocket error:", err);

        setSocket(ws);

        // Cleanup on unmount
        return () => {
            console.info("ws-closed")
            ws.close();
        };
    }, []);



    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <div className="flex items-center justify-between bg-green-600 px-4 py-3 text-white shadow">
                <h1 className="text-lg font-bold">Live Bridge</h1>
                <div className="space-x-4 text-sm">
                    <NavLink
                        to="/profile"
                        className="hover:underline"
                    >
                        Profile
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className="hover:underline"
                    >
                        Settings
                    </NavLink>
                </div>
            </div>

            {/* Top Tabs */}
            <div className="flex bg-green-700 text-white">
                <NavLink
                    to="/chats"
                    className={({ isActive }) =>
                        `flex-1 text-center py-2 font-medium ${isActive ? "border-b-2 border-white" : "opacity-80"
                        }`
                    }
                >
                    Chats
                </NavLink>
                <NavLink
                    to="/status"
                    className={({ isActive }) =>
                        `flex-1 text-center py-2 font-medium ${isActive ? "border-b-2 border-white" : "opacity-80"
                        }`
                    }
                >
                    Status
                </NavLink>
                <NavLink
                    to="/calls"
                    className={({ isActive }) =>
                        `flex-1 text-center py-2 font-medium ${isActive ? "border-b-2 border-white" : "opacity-80"
                        }`
                    }
                >
                    Calls
                </NavLink>
            </div>

            {/* Render Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100">
                <Outlet />
            </div>
        </div>
    );
}
