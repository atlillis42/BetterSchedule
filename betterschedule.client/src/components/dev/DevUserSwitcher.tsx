/**
 * Summary: DEV-only user switcher.
 * - Select from seeded dev/demo users and authenticate via AuthContext.
 * - Optionally triggers DB reset (if provided).
 */
import React from "react";
import { DEV_USERS, type DevUser } from "@/dev/devUsers";
import { attemptDevLogin } from "@/dev/devAuth";

type DevUserSwitcherProps = {
    login: (identifier: string, password: string) => Promise<{ success: boolean } | { success?: boolean } | void>;
    logout: () => Promise<void>;
    onResetDb?: () => Promise<void>;
};

const DevUserSwitcher: React.FC<DevUserSwitcherProps> = ({ login, logout, onResetDb }) => {
    const [selectedKey, setSelectedKey] = React.useState<string>(DEV_USERS[0]?.key ?? "");
    if (!import.meta.env.DEV) return null;

    const selected: DevUser | undefined = DEV_USERS.find(u => u.key === selectedKey);

    const handleSwitch = async () => {
        if (!selected) return;
        await logout(); // clear session first
        const ok = await attemptDevLogin(login, selected);
        if (!ok) alert("Login failed for selected dev user."); // AuthContext should toast already
    };

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="dev-user" className="sr-only">Developer quick login</label>
            <select
                id="dev-user"
                className="text-blue-700 bg-white/90 rounded px-2 py-2 border border-blue-100 min-w-64"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                title="Switch user (development only)"
            >
                <optgroup label="Org1 – Dev">
                    <option value="admin_allroles_org1">Admin (All Roles)</option>
                    <option value="provider_dev_org1">Provider</option>
                    <option value="client_dev_org1">Client</option>
                    <option value="hybrid_dev_org1">Hybrid (Provider+Client)</option>
                </optgroup>
                <optgroup label="Org1 – Demo">
                    <option value="alice_manager_org1">Alice (Manager)</option>
                    <option value="bob_provider_org1">Bob (Provider)</option>
                    <option value="carla_client_org1">Carla (Client)</option>
                </optgroup>
                <optgroup label="Org2 – Demo">
                    <option value="dana_manager_org2">Dana (Manager)</option>
                    <option value="eric_provider_org2">Eric (Provider)</option>
                    <option value="frank_client_org2">Frank (Client)</option>
                </optgroup>
            </select>

            <button
                onClick={handleSwitch}
                className="bg-white text-blue-600 px-3 py-2 rounded hover:bg-blue-50 transition"
                title="Login as selected user"
            >
                Switch
            </button>

            {onResetDb && (
                <button
                    onClick={onResetDb}
                    className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 transition font-bold"
                    title="Reset seeded demo data"
                >
                    Reset DB
                </button>
            )}
        </div>
    );
};

export default DevUserSwitcher;
