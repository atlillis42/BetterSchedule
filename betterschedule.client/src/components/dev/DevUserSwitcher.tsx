/**
 * DEV-only quick user switcher (stays in-app; no bounce to Login).
 */
import React from "react";
import { DEV_USERS, type DevUser } from "@/dev/devUsers";
import { attemptDevLogin } from "@/dev/devAuth";

type Props = {
    login: (identifier: string, password: string) => Promise<{ success: boolean } | void>;
    logout: () => Promise<void>;
    onResetDb?: () => Promise<void>;
};

const DevUserSwitcher: React.FC<Props> = ({ login, logout, onResetDb }) => {
    const [selectedKey, setSelectedKey] = React.useState<string>(DEV_USERS[0]?.key ?? "");
    if (!import.meta.env.DEV) return null;

    const selected: DevUser | undefined = DEV_USERS.find(u => u.key === selectedKey);

    const handleSwitch = async () => {
        if (!selected) return;
        await logout();
        const ok = await attemptDevLogin(login, selected);
        if (!ok) alert("Login failed for selected dev user.");
    };

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="dev-user" className="sr-only">Developer quick login</label>
            <select
                id="dev-user"
                className="text-blue-700 bg-white/90 rounded px-2 py-2 border border-blue-100 min-w-56"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                title="Switch user (development only)"
            >
                {DEV_USERS.map(u => (
                    <option key={u.key} value={u.key}>{u.label}</option>
                ))}
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
