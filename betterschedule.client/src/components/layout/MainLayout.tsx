/**
 * Summary: App shell layout.
 * - Hosts TopNav and global ToastContainer.
 * - Derives role flags for navigation visibility.
 * - Provides a 100% height anchor for full-height content areas.
 */
import React from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "@auth/AuthContext";
import TopNav from "./TopNav";
import AppNavLinks from "./AppNavLinks";

interface MainLayoutProps { children: React.ReactNode; }

/**
 * MainLayout composes the top navigation and a flexible main area.
 * The main region uses a combination of Tailwind classes to ensure
 * descendant components can resolve 100% heights:
 * - flex-1: consume remaining vertical space in the column
 * - min-h-0: allow the flex item to shrink below its content height
 * - h-full: provide an explicit height for children using Parent100Pct
 * - overflow-hidden: prevent double scrollbars in nested panes
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { logout, login, isManager, isProvider } = useAuth();

    const canSeeProviderAvailability = isManager || isProvider;
    const canManage = isManager;

    const handleLogout = async () => {
        await logout();
        // Route guards handle post-logout navigation.
    };

    return (
        <div className="min-h-screen h-full flex flex-col">
            <TopNav
                canSeeProviderAvailability={canSeeProviderAvailability}
                canManage={canManage}
                isProvider={isProvider}
                onLogout={handleLogout}
                login={login}
                logout={logout}
                NavLinks={AppNavLinks}
            />

            {/* Explicit height anchor for 100% descendants */}
            <main className="flex-1 min-h-0 h-full overflow-hidden bg-blue-50">
                {children}
            </main>

            <ToastContainer position="top-right" />
        </div>
    );
};

export default MainLayout;
