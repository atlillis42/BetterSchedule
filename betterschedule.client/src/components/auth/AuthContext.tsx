import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { api } from "./axios.ts";
import { toast } from "react-toastify";

export type AuthContextType = {
    isAuthenticated: boolean;
    user: string | null;        // display name/email
    userId: string | null;      // stable user id
    roles: string[];
    organizationId: string | null;
    loading: boolean;

    // Convenience flags + helper
    isManager: boolean;
    isProvider: boolean;
    isClient: boolean;
    hasRole: (role: string) => boolean;

    login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    refreshAuth: () => void;
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
            // console.log("🧪 /auth/status response", res.data);

            setIsAuthenticated(res.data?.authenticated ?? false);
            setUser(res.data?.user ?? null);
            setUserId(res.data?.userId ?? null);
            setRoles(res.data?.roles ?? []);
            setOrganizationId(res.data?.organizationId ?? null);
        } catch (err) {
            console.error("❌ Auth check failed", err);
            setIsAuthenticated(false);
            setUser(null);
            setUserId(null);
            setRoles([]);
            setOrganizationId(null);
        } finally {
            setLoading(false);
        }
    };

    // Summary: Login; in DEV call flexible identifier endpoint; in PROD call standard endpoint.
    const login = async (email: string, password: string) => {
        try {
            // DEV uses flexible "identifier" login (email or username). PROD uses regular login.
            const url = import.meta.env.MODE === "development" ? "/auth/dev-login" : "/auth/login";
            const payload = import.meta.env.MODE === "development"
                ? { identifier: email, password }
                : { email, password };

            const res = await api.post(url, payload);

            if (res.status === 200) {
                await refreshAuth();
                toast.success("Login successful.");
                return { success: true, message: "Login successful." };
            }

            toast.error(res.data || "Login failed.");
            return { success: false, message: res.data || "Login failed." };
        } catch (err: any) {
            console.error("❌ Login failed", err);
            toast.error(err?.response?.data || "Unexpected error during login.");
            return { success: false, message: err?.response?.data || "Unexpected error during login." };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
            toast.info("Logged out.");
        } catch (err) {
            console.error("❌ Logout failed", err);
            toast.error("Logout failed. Please try again.");
        } finally {
            await refreshAuth();
        }
    };

    useEffect(() => {
        refreshAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Derive flags & helper from roles
    const roleSet = useMemo(() => new Set(roles.map((r) => r.toLowerCase())), [roles]);
    const isManager = roleSet.has("manager");
    // Support either "ServiceProvider" or a shortened "Provider"
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
