import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@auth/auth-context";

/**
 * Gates content to users who have at least one role from `allow`.
 * Redirects to `/unauthorized` when authenticated but insufficiently privileged.
 */
export default function RequireRole({
    allow,
    children,
    redirect = "/unauthorized",
}: {
    allow: string[];
    children: React.ReactNode;
    redirect?: string;
}) {
    const { loading, isAuthenticated, roles } = useAuth();
    if (loading) return <div className="text-center mt-20">🔄 Loading...</div>;
    if (!isAuthenticated) return <Navigate to="/" replace />;

    const hasRole = allow.some((r) => roles.includes(r));
    return hasRole ? children : <Navigate to={redirect} replace />;
}
