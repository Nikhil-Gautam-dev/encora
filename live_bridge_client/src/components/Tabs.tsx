import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";

export default function Tabs() {
    const { chatMessages, notifications } = useWebSocket();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setUnreadCount(chatMessages.filter(m => m.status !== "read" && m.type === "receive_message").length);
    }, [chatMessages]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showMenu]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <header className="flex items-center justify-between bg-teal-700 dark:bg-teal-900 px-4 py-3 text-white shadow">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-white text-3xl font-bold shadow">
                        <img src="encora-filled.svg" alt="" />
                    </div>                    <span className="text-lg font-bold tracking-wide">Encora</span>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <span className="flex h-5 items-center justify-center rounded-full bg-teal-400 dark:bg-teal-600 px-2 text-[11px] font-bold">
                            {unreadCount}
                        </span>
                    )}

                    <Link
                        to="/notifications"
                        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-teal-600 dark:hover:bg-teal-800 transition"
                        title="Notifications"
                    >
                        <Bell size={20} strokeWidth={1.8} />
                        {notifications.length > 0 && (
                            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold">
                                {notifications.length}
                            </span>
                        )}
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(v => !v)}
                            className="h-9 w-9 rounded-full bg-teal-500 dark:bg-teal-700 flex items-center justify-center text-white font-bold hover:bg-teal-400 dark:hover:bg-teal-600 transition"
                        >
                            {user?.name?.[0]?.toUpperCase() ?? "U"}
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-11 w-44 rounded-xl bg-white dark:bg-gray-800 shadow-lg py-1 z-50 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700">
                                <NavLink to="/profile" onClick={() => setShowMenu(false)} className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                                    My Profile
                                </NavLink>
                                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-red-500 dark:text-red-400">
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
                <Outlet />
            </main>
        </div>
    );
}

