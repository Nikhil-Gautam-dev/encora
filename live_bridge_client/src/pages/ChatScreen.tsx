import { useParams, useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useCrypto } from "../context/CryptoContext";
import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";

interface DisplayMessage {
    id: string;
    messageId?: string;
    type: "send_message" | "receive_message";
    from: string;
    to: string;
    message: string;
    status: "sent" | "delivered" | "read";
    createdAt?: string;
}

function formatMsgTime(createdAt?: string): string {
    if (!createdAt) return "";
    try {
        const d = new Date(createdAt);
        return format(d, "h:mm a");
    } catch { return ""; }
}

function formatLastSeen(ls: string | undefined, isOnline: boolean): string {
    if (isOnline) return "Online";
    if (!ls) return "Offline";
    try {
        const d = new Date(ls);
        if (isToday(d)) return `last seen today at ${format(d, "h:mm a")}`;
        if (isYesterday(d)) return `last seen yesterday at ${format(d, "h:mm a")}`;
        return `last seen ${format(d, "MMM d")}`;
    } catch { return "Offline"; }
}

function TickIcon({ status }: { status: "sent" | "delivered" | "read" }) {
    if (status === "sent") return <span className="text-gray-300 text-xs ml-1">✓</span>;
    if (status === "delivered") return <span className="text-gray-300 text-xs ml-1">✓✓</span>;
    return <span className="text-teal-300 text-xs ml-1">✓✓</span>;
}

export default function ChatScreen() {
    const { sendMessage, chatMessages, readMessage, activeUsers, lastSeen, userTyping, messageBanner, clearMessageBanner } = useWebSocket();
    const { encryptForContact, decryptFromContact } = useCrypto();
    const [inputMessage, setInputMessage] = useState("");
    const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [contactName, setContactName] = useState("");
    const [bannerPreview, setBannerPreview] = useState<string>("");
    const { contactId } = useParams<{ contactId: string }>();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Track which IDs have been merged to avoid duplicates
    const processedIds = useRef(new Set<string>());

    // Decrypt banner preview when an encrypted cross-chat message arrives
    useEffect(() => {
        if (!messageBanner?.iv || !messageBanner.ciphertext) {
            setBannerPreview(messageBanner?.preview ?? "");
            return;
        }
        decryptFromContact(messageBanner.ciphertext, messageBanner.iv, messageBanner.fromId)
            .then(setBannerPreview)
            .catch(() => setBannerPreview("loading..."));
    }, [messageBanner, decryptFromContact]);

    // Reset when switching contacts
    useEffect(() => {
        processedIds.current = new Set();
        setDisplayMessages([]);
    }, [contactId]);

    // Load history from API and decrypt
    useEffect(() => {
        if (!contactId) return;

        api.get<{ user: { name: string; username: string } }>(`/user/profile-by-id/${contactId}`)
            .then(res => setContactName(res.user?.name || contactId))
            .catch(() => setContactName(contactId));

        api.get<{ messages: any[] }>(`/messages/${contactId}`)
            .then(async res => {
                const history: DisplayMessage[] = await Promise.all(
                    res.messages.map(async m => {
                        const isMine = m.from !== contactId;
                        let message = m.message;
                        if (m.iv) {
                            // ECDH shared key is symmetric — same key for both sides
                            message = await decryptFromContact(m.message, m.iv, contactId);
                        }
                        processedIds.current.add(m._id);
                        return {
                            id: m._id,
                            messageId: m._id,
                            type: (isMine ? "send_message" : "receive_message") as "send_message" | "receive_message",
                            from: m.from,
                            to: m.to,
                            message,
                            status: m.status,
                            createdAt: m.createdAt
                        };
                    })
                );
                setDisplayMessages(history);
            })
            .catch(() => { });
    }, [contactId]);

    // Merge new live WS messages and decrypt them
    useEffect(() => {
        if (!contactId) return;
        const incoming = chatMessages.filter(m => m.from === contactId || m.to === contactId);
        const newOnes = incoming.filter(m => !processedIds.current.has(m.messageId || m.id));
        if (newOnes.length === 0) return;

        newOnes.forEach(m => processedIds.current.add(m.messageId || m.id));

        (async () => {
            const decrypted = await Promise.all(newOnes.map(async m => {
                let message = m.message;
                if (m.iv) {
                    message = await decryptFromContact(m.message, m.iv, contactId);
                }
                return {
                    id: m.id,
                    messageId: m.messageId,
                    type: m.type,
                    from: m.from,
                    to: m.to,
                    message,
                    status: m.status,
                    createdAt: m.createdAt
                };
            }));
            setDisplayMessages(prev => [...prev, ...decrypted]);
        })();
    }, [chatMessages, contactId]);

    // Sync delivery/read status updates from WS
    useEffect(() => {
        setDisplayMessages(prev => prev.map(m => {
            const ctx = chatMessages.find(c => c.messageId && c.messageId === m.messageId);
            if (ctx && ctx.status !== m.status) return { ...m, status: ctx.status };
            return m;
        }));
    }, [chatMessages]);

    // Send read receipts for unread received messages
    useEffect(() => {
        if (!contactId) return;
        const unread = chatMessages.filter(m => m.from === contactId && m.status !== "read");
        unread.forEach(m => {
            if (m.messageId) {
                sendMessage(JSON.stringify({ type: "message_read", messageId: m.messageId }));
            }
        });
        if (unread.length > 0) {
            readMessage(chatMessages.map(m => m.from === contactId ? { ...m, status: "read" } : m));
        }
    }, [chatMessages, contactId]);

    useEffect(() => {
        if (userTyping.userId === contactId) setIsTyping(userTyping.status);
    }, [userTyping, contactId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages]);

    const handleSend = async () => {
        if (!inputMessage.trim() || !contactId) return;

        const tempId = Date.now().toString();
        const plaintext = inputMessage;

        // Optimistically show plaintext before encryption completes
        const optimistic: DisplayMessage = {
            id: tempId,
            type: "send_message",
            from: "",
            to: contactId,
            message: plaintext,
            status: "sent",
            createdAt: new Date().toISOString()
        };
        setDisplayMessages(prev => [...prev, optimistic]);
        processedIds.current.add(tempId);
        setInputMessage("");

        try {
            const { ciphertext, iv } = await encryptForContact(plaintext, contactId);
            sendMessage(JSON.stringify({ type: "send_message", to: contactId, message: ciphertext, iv, tempId }));
        } catch (err) {
            console.error("Encryption failed:", err);
            setDisplayMessages(prev => prev.filter(m => m.id !== tempId));
            processedIds.current.delete(tempId);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") { e.preventDefault(); handleSend(); }
    };

    const isOnline = activeUsers.get(contactId ?? "") ?? false;
    const ls = lastSeen.get(contactId ?? "");

    return (
        <div
            className="flex flex-col bg-gray-100 dark:bg-gray-950"
            style={{ height: "100dvh" }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 bg-teal-600 dark:bg-teal-900 px-4 py-3 text-white shadow">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-teal-500 dark:hover:bg-teal-800 transition">
                    <ArrowLeft size={20} />
                </button>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-300 font-bold text-lg">
                    {(contactName || contactId || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold leading-tight">{contactName || contactId}</h2>
                    <p className="text-xs text-teal-100 dark:text-teal-300">
                        {isTyping ? "typing..." : formatLastSeen(ls, isOnline)}
                    </p>
                </div>
            </div>

            {/* Cross-chat message banner */}
            {messageBanner && (
                <div
                    onClick={() => { clearMessageBanner(); navigate(`/chat/${messageBanner.fromId}`); }}
                    className="flex items-center gap-3 px-4 py-2.5 bg-teal-600 dark:bg-teal-800 text-white cursor-pointer hover:bg-teal-500 dark:hover:bg-teal-700 transition animate-slide-down shadow-md z-10"
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-teal-400 dark:bg-teal-600 font-bold text-sm">
                        {messageBanner.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight">{messageBanner.name}</p>
                        <p className="text-xs opacity-85 truncate leading-tight">{bannerPreview}</p>
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); clearMessageBanner(); }}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-teal-500 dark:hover:bg-teal-700 transition"
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Messages */}
            <div
                className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden px-4 py-3 space-y-1"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--dot-color, #e5e7eb) 1px, transparent 0)", backgroundSize: "28px 28px" }}
            >
                <style>{`.dark [data-chat-bg] { --dot-color: #374151; }`}</style>
                <div data-chat-bg className="absolute inset-0 -z-10" />
                {displayMessages.map((msg, index) => {
                    const isSent = msg.type === "send_message";
                    return (
                        <div key={msg.id || index} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                            <div className={`relative max-w-xs px-3 py-2 rounded-2xl shadow text-sm ${isSent
                                    ? "bg-teal-500 dark:bg-teal-700 text-white rounded-br-sm"
                                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                                }`}>
                                <span>{msg.message}</span>
                                <div className={`flex items-center justify-end gap-0.5 mt-0.5 ${isSent ? "text-teal-100" : "text-gray-400 dark:text-gray-500"}`}>
                                    <span className="text-[10px]">{formatMsgTime(msg.createdAt)}</span>
                                    {isSent && <TickIcon status={msg.status} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => sendMessage(JSON.stringify({ type: "user_start_typing", to: contactId }))}
                    onBlur={() => sendMessage(JSON.stringify({ type: "user_stop_typing", to: contactId }))}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-4 py-2 outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                />
                <button
                    onClick={handleSend}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 dark:bg-teal-700 text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
