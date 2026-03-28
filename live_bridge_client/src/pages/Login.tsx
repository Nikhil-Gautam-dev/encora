import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { notify } from "../utils/toast";
import { useState } from "react";

export default function Login() {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) {
            notify("Google login failed", "error");
            return;
        }
        setLoading(true);
        try {
            await googleLogin(credentialResponse.credential);
            navigate("/chats");
        } catch (err: any) {
            notify(err.message || "Authentication failed", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-lg flex flex-col items-center gap-6 border border-gray-100 dark:border-gray-800">
                {/* Brand */}
                <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow">
                        L
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LiveBridge</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Chat with friends, instantly.</p>
                </div>

                <div className="w-full border-t border-gray-100 dark:border-gray-800" />

                {loading ? (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        Signing you in...
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 w-full">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to continue</p>
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={() => notify("Google login failed", "error")}
                            theme="outline"
                            size="large"
                            width="300"
                            text="continue_with"
                            shape="pill"
                        />
                    </div>
                )}

                <p className="text-xs text-gray-300 dark:text-gray-600 text-center">
                    By continuing you agree to our terms of service
                </p>
            </div>
        </div>
    );
}
