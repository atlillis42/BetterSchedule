import React from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "@auth/auth-context";
import TopNav from "./TopNav";
import AppNavLinks from "./AppNavLinks";

interface MainLayoutProps {
    /** Child route content. */
    children: React.ReactNode;
}

/**
 * @summary Application shell that hosts the top navigation, global toasts, and a
 * full-height content area.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { logout, isManager } = useAuth();

    const canManage = isManager;

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="min-h-screen h-full flex flex-col">
            <TopNav onLogout={handleLogout} NavLinks={AppNavLinks} />

            {/* Full-height anchor for descendants */}
            <main className="flex-1 min-h-0 h-full overflow-hidden bg-blue-50">{children}</main>

            <ToastContainer position="top-right" />
        </div>
    );
};

export default MainLayout;
