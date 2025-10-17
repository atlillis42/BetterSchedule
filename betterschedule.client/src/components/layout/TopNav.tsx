/**
 * @file Top navigation bar for BetterSchedule (demo-ready).
 * @summary
 * - Left: brand + primary navigation.
 * - Right: "Signed in as {user}", Demo role switcher ("DEMO ONLY:"), and Logout.
 * - Demo selector defaults to the current user's organization and role when possible.
 * - Displays a capitalized first name for the current user, even if they aren't in the demo list.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/auth-context";

/** Props for the top navigation bar. */
export type TopNavProps = {
    /** Primary navigation links, rendered with capability flags. */
    NavLinks: React.ComponentType<{
        canManage: boolean;
    }>;
    /** Optional explicit logout override; otherwise uses AuthContext.logout(). */
    onLogout?: () => Promise<void>;
};

/** Pre-seeded demo account record used by the DemoRoleSwitcher. */
type DemoAccount = {
    organizationId: "demo-org-1" | "demo-org-2";
    organizationLabel: string;
    role: "Manager" | "Provider" | "Client";
    name: string;
    email: string;
    password: string;
};

/** Seeded Demo accounts for Demoing different Users/Orgs — keep in sync with DbInitializer. */
const DEMO_ACCOUNTS: DemoAccount[] = [
    // Org 1 — First Demo Holistic Wellness
    {
        organizationId: "demo-org-1",
        organizationLabel: "First Demo Holistic Wellness",
        role: "Manager",
        name: "Demo User",
        email: "demo.user@local.com",
        password: "Password123!",
    },
    {
        organizationId: "demo-org-1",
        organizationLabel: "First Demo Holistic Wellness",
        role: "Provider",
        name: "Bob Brown",
        email: "bob@example.com",
        password: "Password123!",
    },
    {
        organizationId: "demo-org-1",
        organizationLabel: "First Demo Holistic Wellness",
        role: "Client",
        name: "Carla Chen",
        email: "carla@example.com",
        password: "Password123!",
    },

    // Org 2 — Demo Two, Health Strikes Back
    {
        organizationId: "demo-org-2",
        organizationLabel: "Demo Two, Health Strikes Back",
        role: "Manager",
        name: "Dana Diaz",
        email: "dana@example.com",
        password: "Password123!",
    },
    {
        organizationId: "demo-org-2",
        organizationLabel: "Demo Two, Health Strikes Back",
        role: "Provider",
        name: "Eric Evans",
        email: "e@example.com",
        password: "Password123!",
    },
    {
        organizationId: "demo-org-2",
        organizationLabel: "Demo Two, Health Strikes Back",
        role: "Client",
        name: "Frank Fox",
        email: "frank@example.com",
        password: "Password123!",
    },
];

/** Title-case a single token like "demo" -> "Demo" */
const toTitle = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

/** Resolve a friendly full name when possible (demo mapping), otherwise return the raw string. */
const useResolveDisplayName = () =>
    React.useCallback((emailOrName?: string | null) => {
        const raw = (emailOrName ?? "").trim();
        const mapped = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === raw.toLowerCase())?.name;
        return mapped ?? (raw || "current user");
    }, []);

/** Derive a first-name label for "Signed in as" — works for non-demo users too. */
const useResolveFirstNameLabel = () =>
    React.useCallback((emailOrName?: string | null) => {
        const raw = (emailOrName ?? "").trim();
        if (!raw) return "";

        // Prefer friendly demo mapping if present
        const mapped = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === raw.toLowerCase())?.name;
        if (mapped) {
            const first = mapped.trim().split(/\s+/)[0] ?? mapped;
            return toTitle(first);
        }

        // If it's an email, derive from the local-part
        if (raw.includes("@")) {
            const local = raw.split("@")[0] ?? raw;
            const first = (local.split(/[._-]/)[0] || local).replace(/[^A-Za-z]+/g, "");
            return toTitle(first || local);
        }

        // Otherwise, use the first word
        const first = raw.split(/\s+/)[0] ?? raw;
        return toTitle(first);
    }, []);

/**
 * Renders the top navigation bar with brand, primary links, demo role switcher, and user summary.
 */
const TopNav: React.FC<TopNavProps> = ({ NavLinks, onLogout }) => {
    const navigate = useNavigate();
    const { user, isManager, isProvider, login, logout: authLogout } = useAuth();

    const handleLogout = async () => {
        if (onLogout) {
            await onLogout();
            return;
        }
        await authLogout();
    };

    const resolveDisplayName = useResolveDisplayName();
    const resolveFirstNameLabel = useResolveFirstNameLabel();

    return (
        <header
            className="bg-white text-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-200"
            role="banner"
        >
            {/* Left: Brand + primary navigation */}
            <div className="flex items-center gap-6 min-w-0">
                <button
                    type="button"
                    onClick={() => navigate("/calendar")}
                    className="text-xl font-bold text-blue-600 hover:text-blue-700 focus:outline-none"
                    aria-label="Go to calendar"
                    title="BetterSchedule"
                >
                    BetterSchedule
                </button>

                <NavLinks canManage={isManager} />
            </div>

            {/* Right: Demo role switcher + Signed-in as + Logout */}
            <div className="flex items-center gap-4">
                <DemoRoleSwitcher
                    currentUserEmail={user ?? ""}
                    isManager={isManager}
                    isProvider={isProvider}
                    onSwitch={async (target) => {
                        const previousName = resolveDisplayName(user);
                        try {
                            await authLogout();
                            const result = await login(target.email, target.password);
                            if ((result as any)?.success === false) {
                                toast.error(`Login failed for ${target.name}.`);
                                return;
                            }
                            toast.success(`You've been logged out of ${previousName} and logged in as ${target.name}.`);
                        } catch {
                            toast.error("Switch failed due to an unexpected error.");
                        }
                    }}
                />

                {user && (
                    <span className="hidden sm:block text-sm text-slate-700 max-w-[28ch] truncate" title={user}>
                        Signed in as <span className="font-semibold">{resolveFirstNameLabel(user)}</span>
                    </span>
                )}

                <button
                    onClick={handleLogout}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default TopNav;

/** Props for the in-UI demo role switcher. */
type DemoRoleSwitcherProps = {
    /** Current user's email, used to auto-detect org/role defaults. */
    currentUserEmail: string;
    /** Current role flags to help choose a sensible default when email is not recognized. */
    isManager: boolean;
    isProvider: boolean;
    /** Callback invoked to perform the actual switch. */
    onSwitch: (account: DemoAccount) => Promise<void>;
};

/**
 * Small inline component providing a “DEMO ONLY:” role switcher.
 * Defaults to the current user's organization and role when possible.
 */
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
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider select-none">
                DEMO ONLY:
            </span>

            <label className="sr-only" htmlFor="demo-org">
                Demo organization
            </label>
            <select
                id="demo-org"
                className="text-blue-700 bg-white rounded px-2 py-2 border border-blue-100"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value as "demo-org-1" | "demo-org-2")}
                title="Choose demo organization"
            >
                {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.label}
                    </option>
                ))}
            </select>

            <label className="sr-only" htmlFor="demo-role">
                Demo role
            </label>
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
