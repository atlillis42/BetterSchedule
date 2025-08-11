import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@auth/AuthContext";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();

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
                <h1
                    className="text-xl font-bold cursor-pointer"
                    onClick={() => navigate("/calendar")}
                >
                    BetterSchedule
                </h1>
                <div className="flex items-center gap-2">
                    {/* Admin: Manage Appointment Types */}
                    <button
                        onClick={() => navigate("/admin/appointment-types")}
                        className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition mr-2"
                        style={{ fontWeight: "bold" }}
                    >
                        Manage Appointment Types
                    </button>
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
        </div>
    );
};

export default MainLayout;
