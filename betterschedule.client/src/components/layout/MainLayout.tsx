import React from "react";
import { ToastContainer } from "react-toastify";
import { useAuth } from "@auth/auth-context";
import TopNav from "./TopNav";
import AppNavLinks from "./AppNavLinks";
import { useTheme } from "@/components/theme/ThemeProvider";

interface MainLayoutProps {
    /** Child route content. */
    children: React.ReactNode;
}

/**
 * Application shell: top nav, global toasts, and full-height content area.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { logout } = useAuth();
    const { resolvedTheme } = useTheme();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="min-h-screen h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            <TopNav onLogout={handleLogout} NavLinks={AppNavLinks} />

            {/* Full-height anchor for descendants */}
            <main className="flex-1 min-h-0 h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
                {children}
            </main>

            <ToastContainer position="top-right" theme={resolvedTheme} />
        </div>
    );
};

export default MainLayout;
