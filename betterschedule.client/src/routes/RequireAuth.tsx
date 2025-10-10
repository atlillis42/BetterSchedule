import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@auth/auth-context";

/**
 * Ensures the user is authenticated before rendering children.
 * Redirects to "/" when unauthenticated.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="text-center mt-20">🔄 Loading...</div>;
    return isAuthenticated ? children : <Navigate to="/" replace />;
}
