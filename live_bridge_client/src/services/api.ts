const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const getToken = () => localStorage.getItem("lb_token");

const buildHeaders = (extra?: Record<string, string>) => {
    const token = getToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra
    };
};

export const api = {
    get: async <T = any>(path: string): Promise<T> => {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: "GET",
            headers: buildHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Request failed");
        return data;
    },

    post: async <T = any>(path: string, body: unknown): Promise<T> => {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers: buildHeaders(),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Request failed");
        return data;
    }
};
