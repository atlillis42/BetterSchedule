import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
    baseURL,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
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
