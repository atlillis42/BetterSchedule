import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // cookies are needed for authentication
});