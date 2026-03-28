import { Link, useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { notify } from "../utils/toast";
import { format, isToday, isYesterday } from "date-fns";

interface Contact {
    id: string;
    name: string;
    username: string;
    lastSeen?: string;
}

interface LastMessageEntry {
    message: string;
    from: string;
    createdAt: string;
    status: string;
}

/** Format a message timestamp for the contact list — time if today, day if this week, date otherwise */
const formatMsgDate = (iso: string): string => {
    try {
        const d = new Date(iso);
        if (isToday(d)) return format(d, "h:mm a");
        if (isYesterday(d)) return "Yesterday";
        return format(d, "dd/MM/yy");
    } catch { return ""; }
};

/** Extracts username from a profile URL like http://localhost:5173/u/shadow_nikhil or just a bare username */
const extractUsername = (input: string): string => {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        const parts = url.pathname.split("/").filter(Boolean);
        const uIdx = parts.indexOf("u");
        if (uIdx !== -1 && parts[uIdx + 1]) return parts[uIdx + 1];
    } catch {}
    const match = trimmed.match(/\/u\/([^/?#\s]+)/);
    if (match) return match[1];
    return trimmed;
};

export default function Chats() {
    const { userId, chatMessages, activeUsers, onContactsRefresh, contactRequests, registerContactNames } = useWebSocket();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [lastMessages, setLastMessages] = useState<Record<string, LastMessageEntry>>({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [addProfileUrl, setAddProfileUrl] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const addInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const fetchContacts = async () => {
        try {
            const res = await api.get<{ contacts: Contact[] }>("/user/contacts");
            setContacts(res.contacts);
            const nameMap = new Map(res.contacts.map(c => [c.id, c.name]));
            registerContactNames(nameMap);
        } catch (err: any) {
            console.error("Failed to fetch contacts:", err.message);
        }
    };

    const fetchLastMessages = async () => {
        try {
            const res = await api.get<{ lastMessages: Record<string, LastMessageEntry> }>("/messages/last-messages");
            setLastMessages(res.lastMessages);
        } catch (err: any) {
            console.error("Failed to fetch last messages:", err.message);
        }
    };

    useEffect(() => {
        fetchContacts();
        fetchLastMessages();
    }, [onContactsRefresh]);

    useEffect(() => {
        if (showAddModal) setTimeout(() => addInputRef.current?.focus(), 100);
    }, [showAddModal]);

    const handleAddContact = async () => {
        if (!addProfileUrl.trim()) return;
        const username = extractUsername(addProfileUrl);
        if (!username) { notify("Invalid profile link", "error"); return; }
        setAddLoading(true);
        try {
            await api.post("/user/contacts/request", { username });
            setAddProfileUrl("");
            setShowAddModal(false);
        } catch (err: any) {
            notify(err.message || "Failed to send request", "error");
        } finally {
            setAddLoading(false);
        }
    };

    const getUnreadCount = (contactId: string) =>
        chatMessages.filter(m => m.from === contactId && m.status !== "read").length;

    /** Returns the best available last message for a contact (live WS first, then API snapshot) */
    const getContactPreview = (contactId: string): { text: string; date: string; isMine: boolean } | null => {
        const liveMsgs = chatMessages.filter(m => m.from === contactId || m.to === contactId);
        if (liveMsgs.length > 0) {
            const last = liveMsgs[liveMsgs.length - 1];
            return {
                text: last.message,
                date: last.createdAt ? formatMsgDate(last.createdAt) : "",
                isMine: last.type === "send_message"
            };
        }
        const snap = lastMessages[contactId];
        if (snap) {
            return {
                text: snap.message,
                date: formatMsgDate(snap.createdAt),
                isMine: snap.from === userId
            };
        }
        return null;
    };

    const sortedContacts = [...contacts]
        .filter(c => c.id !== userId)
        .sort((a, b) => {
            const aSnap = lastMessages[a.id];
            const bSnap = lastMessages[b.id];
            if (aSnap && bSnap) return new Date(bSnap.createdAt).getTime() - new Date(aSnap.createdAt).getTime();
            if (aSnap) return -1;
            if (bSnap) return 1;
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
            {/* Requests banner */}
            {contactRequests.length > 0 && (
                <div
                    className="flex items-center justify-between bg-teal-50 dark:bg-teal-900/30 border-b border-teal-100 dark:border-teal-800 px-4 py-2 cursor-pointer"
                    onClick={() => navigate("/notifications")}
                >
                    <span className="text-sm text-teal-700 dark:text-teal-300 font-medium">
                        {contactRequests.length} pending contact request{contactRequests.length > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-teal-500 dark:text-teal-400">View →</span>
                </div>
            )}

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
                {contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                        <p className="text-lg">No contacts yet</p>
                        <p className="text-sm mt-1">Add someone to start chatting</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sortedContacts.map((contact) => {
                            const unread = getUnreadCount(contact.id);
                            const isActive = activeUsers.get(contact.id) ?? false;
                            const preview = getContactPreview(contact.id);
                            return (
                                <Link
                                    key={contact.id}
                                    to={`/chat/${contact.id}`}
                                    className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    <div className="relative shrink-0">
                                        <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-semibold text-lg">
                                            {contact.name[0].toUpperCase()}
                                        </div>
                                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${isActive ? "bg-teal-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{contact.name}</p>
                                            {preview && (
                                                <span className={`shrink-0 text-[11px] ${unread > 0 ? "text-teal-600 dark:text-teal-400 font-semibold" : "text-gray-400 dark:text-gray-500"}`}>
                                                    {preview.date}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5 gap-2">
                                            <p className={`text-xs truncate ${unread > 0 ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                                                {preview
                                                    ? `${preview.isMine ? "You: " : ""}${preview.text}`
                                                    : <span className="italic">No messages yet</span>
                                                }
                                            </p>
                                            {unread > 0 && (
                                                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-medium text-white">
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-80 shadow-xl border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-100">Add Contact</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Paste the person's profile link</p>
                        <input
                            ref={addInputRef}
                            type="text"
                            placeholder="e.g. http://localhost:5173/u/shadow_nikhil"
                            value={addProfileUrl}
                            onChange={e => setAddProfileUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddContact()}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 p-2 outline-none focus:ring-2 focus:ring-teal-500 mb-4 text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddContact}
                                disabled={addLoading}
                                className="flex-1 rounded-lg bg-teal-600 py-2 text-white hover:bg-teal-700 disabled:opacity-60 transition"
                            >
                                {addLoading ? "Sending..." : "Send Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB to add contact */}
            <button
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition flex items-center justify-center text-2xl"
                title="Add contact"
            >
                +
            </button>
        </div>
    );
}


