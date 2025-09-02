/**
 * Summary: App shell layout.
 * - Hosts TopNav and global ToastContainer.
 * - Derives role flags for navigation visibility.
 * - Does not contain dev logic or fetch calls.
 */
import React from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "@auth/AuthContext";
import TopNav from "./TopNav";
import AppNavLinks from "./AppNavLinks";

interface MainLayoutProps { children: React.ReactNode; }

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { logout, login, isManager, isProvider } = useAuth();

    const canSeeProviderAvailability = isManager || isProvider;
    const canManage = isManager;

    const handleLogout = async () => {
        await logout();
        // Route guards handle post-logout navigation.
    };

    return (
        <div className="min-h-screen flex flex-col">
            <TopNav
                canSeeProviderAvailability={canSeeProviderAvailability}
                canManage={canManage}
                isProvider={isProvider}
                onLogout={handleLogout}
                login={login}
                logout={logout}
                NavLinks={AppNavLinks}
            />

            <main className="flex-1 min-h-0 overflow-hidden bg-blue-50">
                {children}
            </main>

            <ToastContainer position="top-right" />
        </div>
    );
};

export default MainLayout;
