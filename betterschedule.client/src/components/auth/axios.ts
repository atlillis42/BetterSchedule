import axios from "axios";
import { toast } from "react-toastify";

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
        if (error.response) {
            const message =
                error.response.data?.message ||
                error.response.data?.error ||
                `Error: ${error.response.status}`;
            toast.error(message, { autoClose: 4000 });
        } else if (error.request) {
            toast.error("No response from server. Please check your connection.", { autoClose: 4000 });
        } else {
            toast.error(error.message, { autoClose: 4000 });
        }
        return Promise.reject(error);
    }
);

export default api;