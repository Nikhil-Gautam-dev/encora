import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setAccessToken } from "../services/api";

export interface AuthUser {
    id: string;
    name: string;
    username: string;
    email: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_KEY = "encora_refresh";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const applyAuth = useCallback((newToken: string, newUser: AuthUser, refreshToken?: string) => {
        setAccessToken(newToken);
        setToken(newToken);
        setUser(newUser);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    }, []);

    const clearAuth = useCallback(() => {
        setAccessToken(null);
        setToken(null);
        setUser(null);
        localStorage.removeItem(REFRESH_KEY);
    }, []);

    // Silent refresh on page load using stored refresh token
    useEffect(() => {
        const silentRefresh = async () => {
            const storedRefresh = localStorage.getItem(REFRESH_KEY);
            if (!storedRefresh) { setIsLoading(false); return; }
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/user/refresh`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ refreshToken: storedRefresh })
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    applyAuth(data.token, data.user, data.refreshToken);
                } else {
                    localStorage.removeItem(REFRESH_KEY);
                }
            } catch { localStorage.removeItem(REFRESH_KEY); }
            finally { setIsLoading(false); }
        };
        silentRefresh();
    }, []);

    // Keep user state in sync when api.ts refreshes the token automatically
    useEffect(() => {
        const onRefreshed = (e: Event) => {
            const { token: t, user: u, refreshToken: rt } = (e as CustomEvent).detail;
            if (t && u) applyAuth(t, u, rt);
        };
        const onExpired = () => clearAuth();
        window.addEventListener("lb:token-refreshed", onRefreshed);
        window.addEventListener("lb:session-expired", onExpired);
        return () => {
            window.removeEventListener("lb:token-refreshed", onRefreshed);
            window.removeEventListener("lb:session-expired", onExpired);
        };
    }, [applyAuth, clearAuth]);

    const googleLogin = async (idToken: string) => {
        const res = await api.post<{ token: string; refreshToken: string; user: AuthUser }>("/user/google-auth", { idToken });
        applyAuth(res.token, res.user, res.refreshToken);
    };

    const logout = async () => {
        try { await api.post("/user/logout", {}); } catch {}
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, isLoading, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
