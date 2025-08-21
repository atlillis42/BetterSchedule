import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";

/**
 * Gate content to Managers OR Providers.
 */
export default function RequireManagerOrProvider({ children }: { children: React.ReactNode }) {
    const { loading, isManager, isProvider } = useAuth();

    if (loading) return null;
    if (isManager || isProvider) return <>{children}</>;

    return <Navigate to="/calendar" replace />;
}
