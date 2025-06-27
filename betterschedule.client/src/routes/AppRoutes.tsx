import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../components/auth/Login";
import Calendar from "../components/calendar/Calendar";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/calendar" element={<Calendar />} />
        </Routes>
    );
};

export default AppRoutes;