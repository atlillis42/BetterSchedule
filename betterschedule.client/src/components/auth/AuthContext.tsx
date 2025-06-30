import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './axios.ts';

/**
 * Context shape
 */
export type AuthContextType = {
    isAuthenticated: boolean;
    user: string | null;
    loading: boolean;
    login: (email: string, password: string
    ) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    refreshAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provider used at the root of the app
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    /**
   * Ask the server for the current session.
   */
    const refreshAuth = async () => {
        try {
            const res = await api.get('/auth/status');
            console.log("🧪 /auth/status response", res.data);

            const authValue = res.data?.authenticated ?? false;
            const userValue = res.data?.user ?? null;

            setIsAuthenticated(authValue);
            setUser(userValue);
        } catch (err) {
            console.error("❌ Auth check failed", err);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const url =
                import.meta.env.MODE === "development" ? "/dev/login" : "/auth/login";

            const res = await api.post(url, { email, password });

            if (res.status === 200) {
                await refreshAuth();
                return { success: true, message: "Login successful." };
            }

            return { success: false, message: res.data || "Login failed." };
        } catch (err: any) {
            console.error("❌ Login failed", err);
            return {
                success: false,
                message: err.response?.data || "Unexpected error during login.",
            };
        }
    };

    /**
   * Logout helper – always re‑sync auth state even if the POST fails.
   */
    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.error("❌ Logout failed", err);
        } finally {
            await refreshAuth();
        }
    };

    // Run the auth check on mount
    useEffect(() => {
        refreshAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook – throws if used outside provider.
 */
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
};