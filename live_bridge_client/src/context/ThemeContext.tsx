import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
    notificationSound: boolean;
    toggleNotificationSound: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_KEY = "lb_dark_mode";
const SOUND_KEY = "lb_notification_sound";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const stored = localStorage.getItem(DARK_KEY);
        // Default to system preference if not set
        if (stored === null) return window.matchMedia("(prefers-color-scheme: dark)").matches;
        return stored === "true";
    });

    const [notificationSound, setNotificationSound] = useState<boolean>(() => {
        const stored = localStorage.getItem(SOUND_KEY);
        return stored === null ? true : stored === "true";
    });

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem(DARK_KEY, String(darkMode));
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem(SOUND_KEY, String(notificationSound));
    }, [notificationSound]);

    const toggleDarkMode = () => setDarkMode(v => !v);
    const toggleNotificationSound = () => setNotificationSound(v => !v);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode, notificationSound, toggleNotificationSound }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
};
