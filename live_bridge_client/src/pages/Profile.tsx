import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/toast";
import { ArrowLeft, Moon, Sun, Volume2, VolumeX } from "lucide-react";

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                enabled ? "bg-teal-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                }`}
            />
        </button>
    );
}

export default function Profile() {
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode, notificationSound, toggleNotificationSound } = useTheme();
    const navigate = useNavigate();

    const profileLink = user ? `${window.location.origin}/u/${user.username}` : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(profileLink)
            .then(() => notify("Profile link copied!", "success"))
            .catch(() => notify("Failed to copy", "error"));
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center gap-3 bg-teal-700 dark:bg-teal-900 px-4 py-3 text-white shadow">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-teal-600 dark:hover:bg-teal-800 transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-base font-semibold">Profile</h1>
            </div>

            <div className="max-w-sm mx-auto px-4 py-8 space-y-4">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-2">
                    <div className="h-24 w-24 rounded-full bg-teal-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {user.name[0].toUpperCase()}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">@{user.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
                </div>

                {/* Profile link */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">Your Profile Link</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-teal-600 dark:text-teal-400 truncate flex-1">{profileLink}</p>
                        <button
                            onClick={handleCopyLink}
                            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 transition"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Share this link so others can add you as a contact</p>
                </div>

                {/* Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-4 pt-4 pb-2">Settings</p>

                    {/* Dark Mode */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            {darkMode
                                ? <Moon size={18} className="text-teal-400" />
                                : <Sun size={18} className="text-teal-600" />
                            }
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{darkMode ? "On" : "Off"}</p>
                            </div>
                        </div>
                        <ToggleSwitch enabled={darkMode} onToggle={toggleDarkMode} />
                    </div>

                    {/* Notification Sound */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            {notificationSound
                                ? <Volume2 size={18} className="text-teal-600 dark:text-teal-400" />
                                : <VolumeX size={18} className="text-gray-400" />
                            }
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Notification Sound</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{notificationSound ? "Enabled" : "Muted"}</p>
                            </div>
                        </div>
                        <ToggleSwitch enabled={notificationSound} onToggle={toggleNotificationSound} />
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-red-200 dark:border-red-900 py-3 text-red-500 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

