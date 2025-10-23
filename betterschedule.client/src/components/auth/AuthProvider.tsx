import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@auth/axios";
import { toast } from "react-toastify";
import { AuthContext, type AuthContextType, type AuthStatusResponse } from "./auth-context";

/**
 * @public
 * Props for {@link AuthProvider}.
 */
export type AuthProviderProps = {
    /** Application subtree that requires authentication context. */
    children: React.ReactNode;
};

/**
 * @public
 * Provides application authentication state (user, roles, organization scope)
 * and actions (login, logout, refreshAuth) via React Context.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [demoSwitcherEnabled, setDemoSwitcherEnabled] = useState<boolean>(false);
    const [isDemo, setIsDemo] = useState<boolean>(false); // ← NEW

    /**
     * Rehydrates auth/claims from the server and updates local flags.
     * Ensures consistent state after login, logout, join-org, and create-org.
     */
    const refreshAuth = useCallback(async (): Promise<void> => {
        try {
            const res = await api.get<AuthStatusResponse>("/auth/status");
            setIsAuthenticated(res.data?.authenticated ?? false);
            setUser(res.data?.user ?? null);
            setUserId(res.data?.userId ?? null);
            setRoles(res.data?.roles ?? []);
            setOrganizationId(res.data?.organizationId ?? null);
            setDemoSwitcherEnabled(Boolean(res.data?.demoSwitcherEnabled));
            setIsDemo(Boolean(res.data?.isDemo)); // ← NEW
        } catch {
            setIsAuthenticated(false);
            setUser(null);
            setUserId(null);
            setRoles([]);
            setOrganizationId(null);
            setDemoSwitcherEnabled(false);
            setIsDemo(false); // ← NEW
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Attempts login in DEV via API or in PROD via site-root Identity endpoint.
     * Does not navigate; caller controls routing after success.
     */
    const login: AuthContextType["login"] = useCallback(
        async (identifierOrEmail, password) => {
            try {
                if (import.meta.env.DEV) {
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
                    const msg =
                        typeof res.data === "string" ? res.data : "Login failed.";
                    toast.error(msg);
                    return { success: false, message: msg };
                }

                // PROD path: Identity login at site root
                const resp = await fetch("/login", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: identifierOrEmail, password }),
                });

                if (resp.ok) {
                    await refreshAuth();
                    toast.success("Logged in.");
                    return { success: true, message: "Logged in." };
                }

                // Surface server message when available
                let msg = "Login failed.";
                try {
                    const data = await resp.json();
                    msg = data?.message || data?.error || msg;
                } catch {
                    /* ignore parse failures */
                }
                toast.error(msg);
                return { success: false, message: msg };
            } catch (err: any) {
                const status = err?.response?.status;
                const serverMsg =
                    err?.response?.data?.message ??
                    err?.response?.data?.error ??
                    (typeof err?.response?.data === "string"
                        ? err.response.data
                        : null);

                const msg =
                    status === 401
                        ? "Invalid email or password."
                        : serverMsg || "Unexpected error during login.";
                toast.error(msg);
                return { success: false, message: msg };
            }
        },
        [refreshAuth]
    );

    /**
     * Logs out and rehydrates client auth state.
     */
    const logout = useCallback(async (): Promise<void> => {
        try {
            await api.post("/auth/logout");
            toast.info("Logged out.");
        } catch {
            toast.error("Logout failed. Please try again.");
        } finally {
            await refreshAuth();
        }
    }, [refreshAuth]);

    // Initial auth load
    useEffect(() => {
        void refreshAuth();
    }, [refreshAuth]);

    // Role helpers (case-insensitive)
    const roleSet = useMemo(
        () => new Set(roles.map((r) => r.toLowerCase())),
        [roles]
    );
    const isManager = roleSet.has("manager");
    const isProvider =
        roleSet.has("serviceprovider") || roleSet.has("provider");
    const isClient = roleSet.has("client");
    const hasRole = (role: string) => roleSet.has(role.toLowerCase());

    const value: AuthContextType = {
        isAuthenticated,
        user,
        userId,
        roles,
        organizationId,
        loading,
        demoSwitcherEnabled,
        isDemo,           
        isManager,
        isProvider,
        isClient,
        hasRole,
        login,
        logout,
        refreshAuth
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
