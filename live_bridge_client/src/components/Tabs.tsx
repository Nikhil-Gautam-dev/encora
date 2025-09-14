import { NavLink, Outlet } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useState, useEffect } from "react";

export default function Tabs() {
    const { chatMessages, userId } = useWebSocket();
    const [readCount, setReadCount] = useState(0);

    useEffect(() => {
        setReadCount(chatMessages.filter((msg) => !msg.read).length);
    }, [chatMessages]);

    const navItems = [
        { to: "/chats", label: `Chats${readCount > 0 ? ` (${readCount})` : ""}` },
        { to: "/status", label: "Status" },
        { to: "/calls", label: "Calls" },
    ];

    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <header className="flex items-center justify-between bg-green-600 px-4 py-3 text-white shadow">
                <h1 className="text-lg font-bold">Live Bridge</h1>
                <span className="text-sm font-medium">Hi, {userId}</span>
                <nav className="space-x-4 text-sm">
                    <NavLink to="/profile" className="hover:underline">
                        Profile
                    </NavLink>
                    <NavLink to="/settings" className="hover:underline">
                        Settings
                    </NavLink>
                </nav>
            </header>

            {/* Top Tabs */}
            <nav className="flex bg-green-700 text-white">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex-1 text-center py-2 font-medium transition ${isActive
                                ? "border-b-2 border-white"
                                : "opacity-80 hover:opacity-100"
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-gray-100">
                <Outlet />
            </main>
        </div>
    );
}
