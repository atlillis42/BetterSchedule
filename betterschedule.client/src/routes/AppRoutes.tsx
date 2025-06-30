import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../components/auth/Login";
import Calendar from "../components/calendar/Calendar";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

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