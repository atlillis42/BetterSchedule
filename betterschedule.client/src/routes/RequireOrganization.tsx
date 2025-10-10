import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@auth/auth-context";

/**
 * @summary Guard that ensures an authenticated user has an active organization scope.
 *
 * @remarks
 * - If unauthenticated: redirect to "/".
 * - If authenticated but no organization: redirect to "/join".
 * - Otherwise renders children.
 */
export default function RequireOrganization({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated, organizationId } = useAuth();

    if (loading) return <div className="text-center mt-20">🔄 Loading...</div>;
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (!organizationId) return <Navigate to="/join" replace />;

    return <>{children}</>;
}
