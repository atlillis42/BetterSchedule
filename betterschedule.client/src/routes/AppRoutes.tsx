import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "@auth/Login";
import Calendar from "@calendar/Calendar";
import MainLayout from "@layout/MainLayout";
import ProtectedRoute from "@layout/ProtectedRoute";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/calendar"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Calendar />
                        </MainLayout>
                    </ProtectedRoute>  
                }
            />
        </Routes>
    );
};

export default AppRoutes;