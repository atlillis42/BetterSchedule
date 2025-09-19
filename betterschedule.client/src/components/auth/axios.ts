import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";
// dev (proxy): leave VITE_API_URL undefined, requests go to https://localhost:<VITE_PORT>/api/*
// direct mode: set VITE_API_URL=https://localhost:7248/api to bypass proxy

export const api = axios.create({
    baseURL,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {        
        if (import.meta.env.DEV) {
            
            console.debug("[api] error", {
                url: error?.config?.url,
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
        }
        return Promise.reject(error);
    }
);

export default api;
