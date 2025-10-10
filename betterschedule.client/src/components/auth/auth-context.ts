import { createContext, useContext } from "react";

/**
 * @public
 * Shape returned by `/api/auth/status`.
 */
export interface AuthStatusResponse {
    /** True when the user has a valid session/cookie. */
    authenticated: boolean;
    /** Display name or email for UI. */
    user: string | null;
    /** Stable user identifier (GUID/string). */
    userId: string | null;
    /** Role names the user currently has. */
    roles: string[];
    /** Active organization identifier, when scoped; otherwise null. */
    organizationId: string | null;
}

/**
 * @public
 * Client auth context contract exposed to the app.
 */
export type AuthContextType = {
    /** User has an authenticated session. */
    isAuthenticated: boolean;
    /** Display name/email for badges/menus. */
    user: string | null;
    /** Stable user id. */
    userId: string | null;
    /** Current roles. */
    roles: string[];
    /** Active organization id (null when org-less). */
    organizationId: string | null;
    /** True while initial or in-flight refresh is resolving. */
    loading: boolean;

    // Convenience flags + helpers
    /** User has Manager role. */
    isManager: boolean;
    /** User has Provider/ServiceProvider role. */
    isProvider: boolean;
    /** User has Client role. */
    isClient: boolean;
    /** Case-insensitive role check. */
    hasRole: (role: string) => boolean;

    /**
     * Logs in the user.
     * - DEV: posts to /api/auth/dev-login with { identifier, password, rememberMe }
     * - PROD: posts to /login (site root) with JSON body { email, password }
     * Resolves with a user-friendly outcome message.
     */
    login: (
        identifierOrEmail: string,
        password: string
    ) => Promise<{ success: boolean; message: string }>;

    /** Logs out via /api/auth/logout and refreshes auth state. */
    logout: () => Promise<void>;

    /** Re-fetches auth/claims from /api/auth/status and updates state. */
    refreshAuth: () => Promise<void>;
};

/**
 * @public
 * React Context for authentication. Value is provided by {@link AuthProvider}.
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * @public
 * Hook to access the current authentication context.
 * @returns The current auth context. Must be used within an {@link AuthProvider}.
 */
export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
};
