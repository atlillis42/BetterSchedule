import axios from 'axios';
import { toast } from 'react-toastify';

export const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

api.interceptors.response.use(
    response => response,
    error => {
        // Global toast notification for API errors
        if (error.response) {
            // Server responded with error status
            const message =
                error.response.data?.message ||
                error.response.data?.error ||
                `Error: ${error.response.status}`;
            toast.error(message, { autoClose: 4000 });
        } else if (error.request) {
            // Request was made but no response (network, CORS)
            toast.error("No response from server. Please check your connection.", { autoClose: 4000 });
        } else {
            // Other error
            toast.error(error.message, { autoClose: 4000 });
        }
        return Promise.reject(error);
    }
);

export default api;
