/**
 * Summary: Top navigation bar.
 * - Left: app title + primary navigation.
 * - Right: DEV user switcher (DEV only) + Logout.
 * - Orchestrates dev DB reset via devTools helper.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import DevUserSwitcher from "@/components/dev/DevUserSwitcher";
import { resetDevDatabase } from "@/dev/devTools";

type TopNavProps = {
    canSeeProviderAvailability: boolean;
    canManage: boolean;
    isProvider: boolean;
    onLogout: () => Promise<void>;
    login: (identifier: string, password: string) => Promise<{ success: boolean } | { success?: boolean } | void>;
    logout: () => Promise<void>;
    NavLinks: React.ComponentType<{ canSeeProviderAvailability: boolean; canManage: boolean; isProvider: boolean }>;
};

const TopNav: React.FC<TopNavProps> = ({
    canSeeProviderAvailability,
    canManage,
    isProvider,
    onLogout,
    login,
    logout,
    NavLinks,
}) => {
    const navigate = useNavigate();

    const handleResetDb = async () => {
        if (!window.confirm("Are you sure you want to reset all demo data?")) return;
        const ok = await resetDevDatabase();
        if (ok) window.location.reload();
        else alert("Reset failed (check API logs).");
    };

    return (
        <header className="bg-white text-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-200">
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold cursor-pointer text-blue-600" onClick={() => navigate("/calendar")}>
                    BetterSchedule
                </h1>
                <NavLinks
                    canSeeProviderAvailability={canSeeProviderAvailability}
                    canManage={canManage}
                    isProvider={isProvider}
                />
            </div>

            <div className="flex items-center gap-2">
                {import.meta.env.DEV && (
                    <DevUserSwitcher login={login} logout={logout} onResetDb={handleResetDb} />
                )}
                <button
                    onClick={onLogout}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default TopNav;
