import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "@auth/Login";
import Calendar from "@calendar/Calendar";
import MainLayout from "@layout/MainLayout";
import ProtectedRoute from "@layout/ProtectedRoute";
import AppointmentTypeManager from "@/components/admin/AppointmentTypeManager";
import { ToastContainer } from "react-toastify";

const AppRoutes = () => {
    return (
        <>
            <Routes>
                {/* Public Login Route */}
                <Route path="/" element={<Login />} />

                {/* Main Calendar (protected) */}
                <Route
                    path="/calendar"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Calendar />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Appointment Types Admin (protected, inside MainLayout) */}
                <Route
                    path="/admin/appointment-types"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <AppointmentTypeManager />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <ToastContainer />
        </>
    );
};

export default AppRoutes;
