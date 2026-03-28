const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// In-memory access token — never stored in localStorage
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;

// Single in-flight refresh promise to prevent concurrent refresh races
let _refreshPromise: Promise<string | null> | null = null;

const tryRefresh = async (): Promise<string | null> => {
    if (_refreshPromise) return _refreshPromise;
    _refreshPromise = fetch(`${BASE_URL}/user/refresh`, {
        method: "POST",
        credentials: "include"
    })
        .then(async r => {
            if (!r.ok) { _accessToken = null; return null; }
            const data = await r.json();
            _accessToken = data.token ?? null;
            // Notify AuthContext so user state stays in sync
            window.dispatchEvent(new CustomEvent("lb:token-refreshed", { detail: data }));
            return _accessToken;
        })
        .catch(() => { _accessToken = null; return null; })
        .finally(() => { _refreshPromise = null; });
    return _refreshPromise;
};

const buildHeaders = (extra?: Record<string, string>) => ({
    "Content-Type": "application/json",
    ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
    ...extra
});

const request = async <T>(path: string, init: RequestInit, retry = true): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: buildHeaders(init.headers as Record<string, string>)
    });

    if (res.status === 401 && retry) {
        const newToken = await tryRefresh();
        if (newToken) {
            // Retry the original request once with the new token
            return request<T>(path, init, false);
        }
        // Refresh failed — user needs to log in again
        window.dispatchEvent(new Event("lb:session-expired"));
        throw new Error("Session expired");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
};

export const api = {
    get: <T = any>(path: string) =>
        request<T>(path, { method: "GET" }),

    post: <T = any>(path: string, body: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(body) }),

    patch: <T = any>(path: string, body: unknown) =>
        request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

    delete: <T = any>(path: string) =>
        request<T>(path, { method: "DELETE" })
};
