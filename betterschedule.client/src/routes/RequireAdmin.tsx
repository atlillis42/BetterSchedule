import React from "react";
import { useAuth } from "@auth/AuthContext";
import { isManager, isProvider } from "@auth/roles";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
    const { roles, loading } = useAuth();
    if (loading) return <div className="text-center mt-20">🔄 Loading...</div>;
    return (isManager(roles) || isProvider(roles))
        ? children
        : <div className="p-4">Not authorized.</div>;
}
