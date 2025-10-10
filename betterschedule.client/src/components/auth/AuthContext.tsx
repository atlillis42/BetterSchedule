//import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
//import { api } from "@auth/axios";
//import { toast } from "react-toastify";

///**
// * @public
// * @remarks
// * Server response shape for the current authentication/claims snapshot.
// */
//export interface AuthStatusResponse {
//    /** True when the user has a valid session/cookie. */
//    authenticated: boolean;
//    /** Display name or email for UI. */
//    user: string | null;
//    /** Stable user identifier (GUID/string). */
//    userId: string | null;
//    /** Role names the user currently has (case-insensitive on client). */
//    roles: string[];
//    /** Active organization identifier, when scoped. */
//    organizationId: string | null;
//}

///**
// * @public
// * @remarks
// * Client auth context contract exposed to the app.
// */
//export type AuthContextType = {
//    /** User has an authenticated session. */
//    isAuthenticated: boolean;
//    /** Display name/email for badges/menus. */
//    user: string | null;
//    /** Stable user id. */
//    userId: string | null;
//    /** Current roles. */
//    roles: string[];
//    /** Active organization id (null when org-less). */
//    organizationId: string | null;
//    /** True while initial or in-flight refresh is resolving. */
//    loading: boolean;

//    // Convenience flags + helpers
//    /** User has Manager role. */
//    isManager: boolean;
//    /** User has Provider/ServiceProvider role. */
//    isProvider: boolean;
//    /** User has Client role. */
//    isClient: boolean;
//    /** Case-insensitive role check. */
//    hasRole: (role: string) => boolean;

//    /**
//     * Logs in the user.
//     * - DEV: posts to /api/auth/dev-login with { identifier, password, rememberMe }
//     * - PROD: posts to /login (site root) with JSON body { email, password }
//     * Resolves with a user-friendly outcome message.
//     */
//    login: (identifierOrEmail: string, password: string) => Promise<{ success: boolean; message: string }>;

//    /** Logs out via /api/auth/logout and refreshes auth state. */
//    logout: () => Promise<void>;

//    /** Re-fetches auth/claims from /api/auth/status and updates state. */
//    refreshAuth: () => Promise<void>;
//};

//const AuthContext = createContext<AuthContextType | null>(null);

//export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//    const [isAuthenticated, setIsAuthenticated] = useState(false);
//    const [user, setUser] = useState<string | null>(null);
//    const [userId, setUserId] = useState<string | null>(null);
//    const [roles, setRoles] = useState<string[]>([]);
//    const [organizationId, setOrganizationId] = useState<string | null>(null);
//    const [loading, setLoading] = useState(true);

//    /**
//     * Rehydrates auth/claims from the server and updates local flags.
//     * Ensures consistent state after login, logout, join-org, and create-org.
//     */
//    const refreshAuth = useCallback(async (): Promise<void> => {
//        try {
//            const res = await api.get<AuthStatusResponse>("/auth/status");
//            setIsAuthenticated(res.data?.authenticated ?? false);
//            setUser(res.data?.user ?? null);
//            setUserId(res.data?.userId ?? null);
//            setRoles(res.data?.roles ?? []);
//            setOrganizationId(res.data?.organizationId ?? null);
//        } catch {
//            setIsAuthenticated(false);
//            setUser(null);
//            setUserId(null);
//            setRoles([]);
//            setOrganizationId(null);
//        } finally {
//            setLoading(false);
//        }
//    }, []);

//    /**
//     * Attempts login in DEV via API or in PROD via site-root Identity endpoint.
//     * Does not navigate; caller controls routing after success.
//     */
//    const login = useCallback(
//        async (identifierOrEmail: string, password: string) => {
//            try {
//                if (import.meta.env.DEV) {
//                    const res = await api.post("/auth/dev-login", {
//                        identifier: identifierOrEmail,
//                        password,
//                        rememberMe: false,
//                    });
//                    if (res.status >= 200 && res.status < 300) {
//                        await refreshAuth();
//                        toast.success("Logged in.");
//                        return { success: true, message: "Logged in." };
//                    }
//                    const msg = typeof res.data === "string" ? res.data : "Login failed.";
//                    toast.error(msg);
//                    return { success: false, message: msg };
//                }

//                // PROD path: Identity login at site root
//                const resp = await fetch("/login", {
//                    method: "POST",
//                    credentials: "include",
//                    headers: { "Content-Type": "application/json" },
//                    body: JSON.stringify({ email: identifierOrEmail, password }),
//                });

//                if (resp.ok) {
//                    await refreshAuth();
//                    toast.success("Logged in.");
//                    return { success: true, message: "Logged in." };
//                }

//                // Surface server message when available
//                let msg = "Login failed.";
//                try {
//                    const data = await resp.json();
//                    msg = data?.message || data?.error || msg;
//                } catch {
//                    /* ignore body parse failures */
//                }
//                toast.error(msg);
//                return { success: false, message: msg };
//            } catch (err: any) {
//                const status = err?.response?.status;
//                const serverMsg =
//                    err?.response?.data?.message ??
//                    err?.response?.data?.error ??
//                    (typeof err?.response?.data === "string" ? err.response.data : null);

//                const msg = status === 401 ? "Invalid email or password." : serverMsg || "Unexpected error during login.";
//                toast.error(msg);
//                return { success: false, message: msg };
//            }
//        },
//        [refreshAuth]
//    );

//    /**
//     * Logs out and rehydrates client auth state.
//     */
//    const logout = useCallback(async (): Promise<void> => {
//        try {
//            await api.post("/auth/logout");
//            toast.info("Logged out.");
//        } catch {
//            toast.error("Logout failed. Please try again.");
//        } finally {
//            await refreshAuth();
//        }
//    }, [refreshAuth]);

//    // Initial auth load
//    useEffect(() => {
//        // fire-and-forget; provider manages loading flag
//        void refreshAuth();
//    }, [refreshAuth]);

//    // Role helpers (case-insensitive)
//    const roleSet = useMemo(() => new Set(roles.map((r) => r.toLowerCase())), [roles]);
//    const isManager = roleSet.has("manager");
//    const isProvider = roleSet.has("serviceprovider") || roleSet.has("provider");
//    const isClient = roleSet.has("client");
//    const hasRole = useCallback((role: string) => roleSet.has(role.toLowerCase()), [roleSet]);

//    return (
//        <AuthContext.Provider
//            value={{
//                isAuthenticated,
//                user,
//                userId,
//                roles,
//                organizationId,
//                loading,
//                isManager,
//                isProvider,
//                isClient,
//                hasRole,
//                login,
//                logout,
//                refreshAuth,
//            }}
//        >
//            {children}
//        </AuthContext.Provider>
//    );
//};

///**
// * @public
// * @returns The current auth context. Must be used within an {@link AuthProvider}.
// */
//export const useAuth = (): AuthContextType => {
//    const ctx = useContext(AuthContext);
//    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
//    return ctx;
//};
