import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type AuthContextType = {
    isAuthenticated: boolean;
    user: string | null;       // display name/email
    userId: string | null;     // stable user id
    roles: string[];
    organizationId: string | null;
    loading: boolean;

    // Convenience flags + helper
    isManager: boolean;
    isProvider: boolean;
    isClient: boolean;
    hasRole: (role: string) => boolean;

    /**
     * Logs in the user.
     * - DEV: POST /api/auth/dev-login with { identifier, password, rememberMe:false }
     * - PROD: POST /api/auth/login with { identifier, password, rememberMe:false }
     */
    login: (identifierOrEmail: string, password: string) => Promise<{ success: boolean; message: string }>;

    /** Logs out via /api/auth/logout and refreshes auth state. */
    logout: () => Promise<void>;

    /** Re-fetches auth/claims from /api/auth/status. */
    refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = async () => {
        try {
            const res = await api.get("/auth/status");
            setIsAuthenticated(res.data?.authenticated ?? false);
            setUser(res.data?.user ?? null);
            setUserId(res.data?.userId ?? null);
            setRoles(res.data?.roles ?? []);
            setOrganizationId(res.data?.organizationId ?? null);
        } catch {
            setIsAuthenticated(false);
            setUser(null);
            setUserId(null);
            setRoles([]);
            setOrganizationId(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (identifierOrEmail: string, password: string) => {
        try {
            if (import.meta.env.DEV) {
                // DEV path: flexible login
                const res = await api.post("/auth/dev-login", {
                    identifier: identifierOrEmail,
                    password,
                    rememberMe: false,
                });
                if (res.status >= 200 && res.status < 300) {
                    await refreshAuth();
                    toast.success("Logged in.");
                    return { success: true, message: "Logged in." };
                }
                const msg = typeof res.data === "string" ? res.data : "Login failed.";
                toast.error(msg);
                return { success: false, message: msg };
            }

            // PROD path: standard login
            const res = await api.post("/auth/login", {
                identifier: identifierOrEmail,
                password,
                rememberMe: false,
            });

            if (res.status >= 200 && res.status < 300) {
                await refreshAuth();
                toast.success("Logged in.");
                return { success: true, message: "Logged in." };
            }

            const msg = typeof res.data === "string" ? res.data : "Login failed.";
            toast.error(msg);
            return { success: false, message: msg };
        } catch (err: any) {
            const status = err?.response?.status;
            const serverMsg =
                err?.response?.data?.message ??
                err?.response?.data?.error ??
                (typeof err?.response?.data === "string" ? err.response.data : null);

            const msg = status === 401 ? "Invalid email or password." : serverMsg || "Unexpected error during login.";
            toast.error(msg);
            return { success: false, message: msg };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
            toast.info("Logged out.");
        } catch {
            toast.error("Logout failed. Please try again.");
        } finally {
            await refreshAuth();
        }
    };

    useEffect(() => {
        // initial auth fetch
        refreshAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Role helpers
    const roleSet = useMemo(() => new Set(roles.map((r) => r.toLowerCase())), [roles]);
    const isManager = roleSet.has("manager");
    const isProvider = roleSet.has("serviceprovider") || roleSet.has("provider");
    const isClient = roleSet.has("client");
    const hasRole = (role: string) => roleSet.has(role.toLowerCase());

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                userId,
                roles,
                organizationId,
                loading,
                isManager,
                isProvider,
                isClient,
                hasRole,
                login,
                logout,
                refreshAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
};
