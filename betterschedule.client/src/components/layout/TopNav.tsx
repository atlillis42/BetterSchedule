/**
 * Summary: Top navigation bar.
 * - Left: app title + primary navigation.
 * - Right: DEV identity summary + DEV user switcher (DEV only) + Logout.
 * - Orchestrates dev DB reset via devTools helper.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import DevUserSwitcher from "@/components/dev/DevUserSwitcher";
import { resetDevDatabase } from "@/dev/devTools";
import { useAuth } from "@auth/AuthContext";

type TopNavProps = {
    canSeeProviderAvailability: boolean;
    canManage: boolean;
    isProvider: boolean;
    onLogout: () => Promise<void>;
    login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
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
    const { organizationId, user, roles, isProvider: ctxIsProvider } = useAuth();

    // Adapter to satisfy DevUserSwitcher’s narrower login type
    const loginForSwitcher = React.useCallback(
        async (identifier: string, password: string) => {
            const res = await login(identifier, password); // { success: boolean; message: string }
            return { success: res.success };               // narrow to { success: boolean }
        },
        [login]
    );

    const handleResetDb = async () => {
        if (!window.confirm("Are you sure you want to reset all demo data?")) return;
        const ok = await resetDevDatabase();
        if (ok) window.location.reload();
        else alert("Reset failed (check API logs).");
    };

    return (
        <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/calendar")}>
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
                    <div
                        className="hidden md:flex items-center gap-2 mr-2 px-2 py-1 rounded bg-white/90 text-blue-700 border border-blue-100"
                        title="Development identity summary"
                    >
                        <span className="text-xs"><span className="font-semibold">Org</span>: {organizationId ?? "—"}</span>
                        <span className="text-xs"><span className="font-semibold">User</span>: {user ?? "—"}</span>
                        <span className="text-xs"><span className="font-semibold">Roles</span>: {roles?.length ? roles.join(", ") : "—"}</span>
                        <span className="text-xs"><span className="font-semibold">Provider</span>: {ctxIsProvider ? "Yes" : "No"}</span>
                    </div>
                )}

                {import.meta.env.DEV && (
                    <DevUserSwitcher login={loginForSwitcher} logout={logout} onResetDb={handleResetDb} />
                )}
                <button
                    onClick={onLogout}
                    className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default TopNav;
