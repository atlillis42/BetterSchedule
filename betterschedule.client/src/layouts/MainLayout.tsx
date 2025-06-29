import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../components/auth/axios"; 
import { useAuth } from "../components/auth/AuthContext";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const { refreshAuth } = useAuth(); // get the refreshAuth function from context 

    const handleLogout = async () => {
        try {
            const result = await api.post("/auth/logout");
            console.log("🔓 Logout response", result.data);
            await refreshAuth(); // update auth state
            navigate("/"); // go back to login screen
        } catch (err) {
            console.error("Logout failed", err);
        }
    };


    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/calendar")}>
                    BetterSchedule
                </h1>
                <button
                    onClick={handleLogout}
                    className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                >
                    Logout
                </button>
            </header>

            <main className="flex-1 bg-blue-50 h-[calc(100vh-4rem)] overflow-hidden">
                {children}
            </main>

        </div>
    );
};

export default MainLayout;