import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@auth/AuthContext";
import { isManager, isProvider } from "@auth/roles";
import { ToastContainer } from "react-toastify";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const { logout, roles } = useAuth();

    const canAdmin = isManager(roles) || isProvider(roles);

    const handleDevReset = async () => {
        if (!window.confirm("Are you sure you want to reset all demo data?")) return;
        try {
            await fetch("/api/devtools/reset-db", { method: "POST" });
            window.location.reload();
        } catch {
            alert("Reset failed (check API logs).");
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-6">
                    <h1
                        className="text-xl font-bold cursor-pointer"
                        onClick={() => navigate("/calendar")}
                    >
                        BetterSchedule
                    </h1>
                    <nav className="flex items-center gap-4 text-sm">
                        <NavLink
                            to="/calendar"
                            className={({ isActive }) => (isActive ? "font-semibold" : "")}
                        >
                            Calendar
                        </NavLink>
                        {canAdmin && (
                            <>
                                <NavLink
                                    to="/admin/appointment-types"
                                    className={({ isActive }) => (isActive ? "font-semibold" : "")}
                                >
                                    Appointment Types
                                </NavLink>
                                <NavLink
                                    to="/admin/resources"
                                    className={({ isActive }) => (isActive ? "font-semibold" : "")}
                                >
                                    Resources
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    {import.meta.env.DEV && (
                        <button
                            onClick={handleDevReset}
                            className="bg-yellow-500 text-white px-4 py-2 rounded mr-2 hover:bg-yellow-600 transition"
                            style={{ fontWeight: "bold" }}
                        >
                            Reset DB
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="flex-1 bg-blue-50 h-[calc(100vh-4rem)] overflow-hidden">
                {children}
            </main>

            <ToastContainer position="top-right" />
        </div>
    );
};

export default MainLayout;
