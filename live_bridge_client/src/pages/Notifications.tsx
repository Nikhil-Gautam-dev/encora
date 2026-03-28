import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import type { INotification } from "../context/WebSocketContext";
import { api } from "../services/api";
import { notify } from "../utils/toast";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, UserPlus, UserCheck, UserX, Bell, X } from "lucide-react";

function NotifIcon({ type }: { type: INotification["type"] }) {
    if (type === "contact_request") return <UserPlus size={18} className="text-teal-600" />;
    if (type === "contact_accepted") return <UserCheck size={18} className="text-green-500" />;
    return <UserX size={18} className="text-red-400" />;
}

function notifLabel(n: INotification): { title: string; sub: string } {
    if (n.type === "contact_request") return {
        title: n.from.name,
        sub: `@${n.from.username} wants to add you as a contact`
    };
    if (n.type === "contact_accepted") return {
        title: n.from.name,
        sub: `@${n.from.username} accepted your contact request`
    };
    return {
        title: n.from.name,
        sub: `@${n.from.username} declined your contact request`
    };
}

export default function Notifications() {
    const navigate = useNavigate();
    const { notifications, dismissNotification, clearAllNotifications, refreshContacts } = useWebSocket();

    const requests = notifications.filter(n => n.type === "contact_request");
    const others = notifications.filter(n => n.type !== "contact_request");

    const handleAccept = async (n: INotification) => {
        try {
            await api.post("/user/contacts/accept", { userId: n.from.id });
            notify(`${n.from.name} added to contacts`, "success");
            dismissNotification(n.id);
            refreshContacts();
        } catch (err: any) {
            notify(err.message || "Failed to accept", "error");
        }
    };

    const handleDecline = async (n: INotification) => {
        try {
            await api.post("/user/contacts/decline", { userId: n.from.id });
            notify("Request declined", "info");
            dismissNotification(n.id);
        } catch (err: any) {
            notify(err.message || "Failed to decline", "error");
        }
    };

    const isEmpty = notifications.length === 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between bg-teal-700 px-4 py-3 text-white shadow">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-teal-600 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base font-semibold">Notifications</h1>
                </div>
                {!isEmpty && (
                    <button
                        onClick={clearAllNotifications}
                        className="text-xs text-teal-200 hover:text-white transition"
                    >
                        Clear info
                    </button>
                )}
            </div>

            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
                {isEmpty && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Bell size={48} strokeWidth={1} className="mb-3 text-gray-300" />
                        <p className="text-base font-medium">No notifications</p>
                        <p className="text-sm mt-1">You're all caught up</p>
                    </div>
                )}

                {/* Contact Requests */}
                {requests.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contact Requests</p>
                        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                            {requests.map(n => {
                                const { title, sub } = notifLabel(n);
                                return (
                                    <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold shrink-0">
                                            {title[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{title}</p>
                                            <p className="text-xs text-gray-400 truncate">{sub}</p>
                                            <p className="text-[10px] text-gray-300 mt-0.5">
                                                {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleAccept(n)}
                                                className="rounded-lg bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 transition"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleDecline(n)}
                                                className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 transition"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Info notifications (accepted / declined) */}
                {others.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Recent Activity</p>
                        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                            {others.map(n => {
                                const { title, sub } = notifLabel(n);
                                return (
                                    <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <NotifIcon type={n.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{title}</p>
                                            <p className="text-xs text-gray-400 truncate">{sub}</p>
                                            <p className="text-[10px] text-gray-300 mt-0.5">
                                                {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => dismissNotification(n.id)}
                                            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
                                            title="Dismiss"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
