import { API_URL } from "../environment-variables/environments";

export const api = {
    get: async (endpoint: string, options?: RequestInit) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            ...options,
        });
        return res.json();
    },

    post: async (endpoint: string, body?: any, options?: RequestInit) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...options?.headers },
            body: JSON.stringify(body),
            ...options,
        });
        return res.json();
    },

    delete: async (endpoint: string, options?: RequestInit) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            ...options,
        });
        return res.json();
    },
};
