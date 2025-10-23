/**
 * @file DemoRoleSwitcher (standalone). Not wired into TopNav by default.
 */
import React from "react";
import { toast } from "react-toastify";

type DemoAccount = {
    organizationId: "demo-org-1" | "demo-org-2";
    organizationLabel: string;
    role: "Manager" | "Provider" | "Client";
    name: string;
    email: string;
    password: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
    { organizationId: "demo-org-1", organizationLabel: "First Demo Holistic Wellness", role: "Manager", name: "Demo User", email: "demo.user@local.com", password: "Password123!" },
    { organizationId: "demo-org-1", organizationLabel: "First Demo Holistic Wellness", role: "Provider", name: "Bob Brown", email: "bob@example.com", password: "Password123!" },
    { organizationId: "demo-org-1", organizationLabel: "First Demo Holistic Wellness", role: "Client", name: "Carla Chen", email: "carla@example.com", password: "Password123!" },
    { organizationId: "demo-org-2", organizationLabel: "Demo Two, Health Strikes Back", role: "Manager", name: "Dana Diaz", email: "dana@example.com", password: "Password123!" },
    { organizationId: "demo-org-2", organizationLabel: "Demo Two, Health Strikes Back", role: "Provider", name: "Eric Evans", email: "e@example.com", password: "Password123!" },
    { organizationId: "demo-org-2", organizationLabel: "Demo Two, Health Strikes Back", role: "Client", name: "Frank Fox", email: "frank@example.com", password: "Password123!" },
];

export type DemoRoleSwitcherProps = {
    currentUserEmail: string;
    isManager: boolean;
    isProvider: boolean;
    onSwitch: (account: DemoAccount) => Promise<void>;
};

const DemoRoleSwitcher: React.FC<DemoRoleSwitcherProps> = ({
    currentUserEmail,
    isManager,
    isProvider,
    onSwitch,
}) => {
    const matched = React.useMemo(
        () => DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === (currentUserEmail ?? "").toLowerCase()),
        [currentUserEmail]
    );

    const fallbackRole: "Manager" | "Provider" | "Client" = isManager ? "Manager" : isProvider ? "Provider" : "Client";

    const [organizationId, setOrganizationId] = React.useState<"demo-org-1" | "demo-org-2">(
        matched?.organizationId ?? "demo-org-1"
    );
    const [role, setRole] = React.useState<"Manager" | "Provider" | "Client">(matched?.role ?? fallbackRole);

    React.useEffect(() => {
        if (matched) {
            setOrganizationId(matched.organizationId);
            setRole(matched.role);
        } else {
            setRole(fallbackRole);
        }
    }, [matched, fallbackRole]);

    const organizations = React.useMemo(() => {
        const unique = new Map<string, string>();
        for (const a of DEMO_ACCOUNTS) {
            if (!unique.has(a.organizationId)) unique.set(a.organizationId, a.organizationLabel);
        }
        return Array.from(unique, ([id, label]) => ({ id, label })) as {
            id: "demo-org-1" | "demo-org-2";
            label: string;
        }[];
    }, []);

    const handleSwitchClick = async () => {
        const target = DEMO_ACCOUNTS.find((a) => a.organizationId === organizationId && a.role === role);
        if (!target) {
            toast.error("No demo account found for the selected organization and role.");
            return;
        }
        await onSwitch(target);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider select-none">DEMO ONLY:</span>

            <label className="sr-only" htmlFor="demo-org">Demo organization</label>
            <select
                id="demo-org"
                className="text-blue-700 bg-white rounded px-2 py-2 border border-blue-100"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value as "demo-org-1" | "demo-org-2")}
                title="Choose demo organization"
            >
                {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                ))}
            </select>

            <label className="sr-only" htmlFor="demo-role">Demo role</label>
            <select
                id="demo-role"
                className="text-blue-700 bg-white rounded px-2 py-2 border border-blue-100"
                value={role}
                onChange={(e) => setRole(e.target.value as "Manager" | "Provider" | "Client")}
                title="Choose role to log in as"
            >
                <option value="Manager">Manager</option>
                <option value="Provider">Provider</option>
                <option value="Client">Client</option>
            </select>

            <button
                onClick={handleSwitchClick}
                className="bg-white text-blue-700 px-3 py-2 rounded border border-blue-200 hover:bg-blue-50 transition"
                title="Login as selected demo user"
            >
                Switch
            </button>
        </div>
    );
};

export default DemoRoleSwitcher;
