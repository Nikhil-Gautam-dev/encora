import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

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
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem("lb_token");
        const storedUser = localStorage.getItem("lb_user");
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const persist = (token: string, user: AuthUser) => {
        localStorage.setItem("lb_token", token);
        localStorage.setItem("lb_user", JSON.stringify(user));
        setToken(token);
        setUser(user);
    };

    const googleLogin = async (idToken: string) => {
        const res = await api.post<{ token: string; user: AuthUser }>("/user/google-auth", { idToken });
        persist(res.token, res.user);
    };

    const logout = () => {
        localStorage.removeItem("lb_token");
        localStorage.removeItem("lb_user");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
