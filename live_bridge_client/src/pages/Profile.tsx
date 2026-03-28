import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/toast";
import { ArrowLeft } from "lucide-react";

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const profileLink = user ? `${window.location.origin}/u/${user.username}` : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(profileLink)
            .then(() => notify("Profile link copied!", "success"))
            .catch(() => notify("Failed to copy", "error"));
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 bg-teal-700 px-4 py-3 text-white shadow">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-teal-600 transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-base font-semibold">Profile</h1>
            </div>
            <div className="max-w-sm mx-auto px-4 py-8">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                    <div className="h-24 w-24 rounded-full bg-teal-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {user.name[0].toUpperCase()}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">@{user.username}</p>
                    <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                </div>

                {/* Profile link */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Your Profile Link</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-teal-600 truncate flex-1">{profileLink}</p>
                        <button
                            onClick={handleCopyLink}
                            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 transition"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Share this link so others can add you as a contact</p>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-red-200 py-3 text-red-500 font-medium hover:bg-red-50 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
