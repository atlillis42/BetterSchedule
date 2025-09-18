import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@auth/AuthContext";

/**
 * Ensures the authenticated user has an active organization scope.
 * - If unauthenticated: redirect to "/" (login).
 * - If no organization: redirect to "/join".
 */
export default function RequireOrganization({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated, organizationId } = useAuth();

    if (loading) return <div className="text-center mt-20">🔄 Loading...</div>;
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (!organizationId) return <Navigate to="/join" replace />;

    return <>{children}</>;
}
