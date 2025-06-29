import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../components/auth/Login";
import Calendar from "../components/calendar/Calendar";
import MainLayout from "../layouts/MainLayout";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/calendar" element={
                <MainLayout>
                    <Calendar />
                </MainLayout> 
                }
            />
        </Routes>
    );
};

export default AppRoutes;