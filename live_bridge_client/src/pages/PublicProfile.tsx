import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../utils/toast";

interface PublicUser {
    name: string;
    username: string;
}

export default function PublicProfile() {
    const { username } = useParams<{ username: string }>();
    const { isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!username) return;
        api.get<{ user: PublicUser }>(`/user/profile/${username}`)
            .then(res => setProfile(res.user))
            .catch(() => setProfile(null))
            .finally(() => setLoading(false));
    }, [username]);

    const handleAddContact = async () => {
        if (!isAuthenticated) { navigate("/login"); return; }
        setRequesting(true);
        try {
            await api.post("/user/contacts/request", { username });
        } catch (err: any) {
            notify(err.message || "Failed to send request", "error");
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950">
                <p className="text-2xl">😶</p>
                <p className="font-medium">User not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-lg text-center border border-gray-100 dark:border-gray-800">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-white text-3xl font-bold">
                    {profile.name[0].toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h2>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">@{profile.username}</p>
                <button
                    onClick={handleAddContact}
                    disabled={requesting}
                    className="mt-6 w-full rounded-xl bg-teal-600 py-2.5 text-white font-medium hover:bg-teal-700 disabled:opacity-60 transition"
                >
                    {requesting ? "Sending..." : "Add Contact"}
                </button>
            </div>
        </div>
    );
}
