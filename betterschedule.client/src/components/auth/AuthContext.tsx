import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './axios.ts';

type AuthContextType = {
    isAuthenticated: boolean;
    user: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    refreshAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = async () => {
        try {
            const res = await api.get('/auth/status');
            setIsAuthenticated(res.data.isAuthenticated);
            setUser(res.data.user);
        } catch {
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            let response;

            if (import.meta.env.MODE === 'development') {
                response = await api.post('/dev/login');
            } else {
                response = await api.post('/auth/login', { email, password });
            }

            if (response.status === 200) {
                await refreshAuth();
                return { success: true, message: 'Logged in successfully.' };
            } else {
                return { success: false, message: response.data || 'Login failed.' };
            }
        } catch (err: any) {
            console.error(err);
            return {
                success: false,
                message: err.response?.data || 'Unexpected error during login.',
            };
        }
    };

    useEffect(() => {
        refreshAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, login, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
