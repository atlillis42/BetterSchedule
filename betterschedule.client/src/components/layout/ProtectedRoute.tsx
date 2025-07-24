import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@auth/AuthContext";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated, loading } = useAuth();

    console.log("🔐 ProtectedRoute →", {
        isAuthenticated,
        loading
    });

    if (loading) {
        return <div className="text-center mt-20">🔄 Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
