import { useEffect, useMemo, useState } from "react";
import type { RoleName } from "@/api/user-api";
import { toast } from "react-toastify";

export type UserManagerModalUser = {
    id: string;
    name: string;
    email?: string | null;
    roles: string[];
    phone?: string | null;
};

export type UserManagerModalProps = {
    open: boolean;
    onClose: () => void;
    user: UserManagerModalUser | null;
    availableRoles: readonly RoleName[];
    isBusy: (key: string) => boolean;
    onToggleRole: (userId: string, role: RoleName, enable: boolean) => Promise<void>;
    onSaveLocalContact: (userId: string, email: string, phone: string) => void;
};

function Toggle({
    enabled,
    onToggle,
    ariaLabel,
    disabled,
}: {
    enabled: boolean;
    onToggle: () => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={ariaLabel}
            onClick={disabled ? undefined : onToggle}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 ${enabled ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

export default function UserManagerModal(props: UserManagerModalProps) {
    const {
        open,
        onClose,
        user,
        availableRoles,
        isBusy,
        onToggleRole,
        onSaveLocalContact,
    } = props;

    const [email, setEmail] = useState<string>(user?.email ?? "");
    const [phone, setPhone] = useState<string>(user?.phone ?? "");

    const [initialRoles, setInitialRoles] = useState<readonly RoleName[]>([]);
    const [draftRoles, setDraftRoles] = useState<Set<RoleName>>(new Set());

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !user) return;
        setEmail(user.email ?? "");
        setPhone(user.phone ?? "");
        setInitialRoles([...user.roles] as RoleName[]);
        setDraftRoles(new Set(user.roles as RoleName[]));
    }, [open, user]);

    const initialSet = useMemo(() => new Set(initialRoles), [initialRoles]);

    const contactChanged =
        (user?.email ?? "") !== (email ?? "") || (user?.phone ?? "") !== (phone ?? "");

    const hasRoleChanges = useMemo(() => {
        if (draftRoles.size !== initialSet.size) return true;
        for (const r of draftRoles) if (!initialSet.has(r)) return true;
        return false;
    }, [draftRoles, initialSet]);

    const hasChanges = contactChanged || hasRoleChanges;

    function toggleRole(role: RoleName) {
        setDraftRoles((prev) => {
            const next = new Set(prev);
            if (next.has(role)) next.delete(role);
            else next.add(role);
            return next;
        });
    }

    async function handleSave(): Promise<void> {
        if (!user) return;

        onSaveLocalContact(user.id, (email ?? "").trim(), (phone ?? "").trim());

        const toAdd: RoleName[] = [];
        const toRemove: RoleName[] = [];
        for (const r of draftRoles) if (!initialSet.has(r)) toAdd.push(r);
        for (const r of initialRoles) if (!draftRoles.has(r)) toRemove.push(r);

        if (toAdd.length === 0 && toRemove.length === 0) {
            onClose();
            return;
        }

        setSaving(true);
        try {
            await Promise.all([
                ...toAdd.map((r) => onToggleRole(user.id, r, true)),
                ...toRemove.map((r) => onToggleRole(user.id, r, false)),
            ]);
            onClose();
        } catch {
            toast.error("Failed to save role changes.");
        } finally {
            setSaving(false);
        }
    }

    if (!open || !user) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="bs-modal w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <h2 className="text-base font-semibold">Edit: {user.name}</h2>
                    <button
                        className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Close"
                        onClick={onClose}
                        disabled={saving}
                    >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                            <path
                                d="M14.348 5.652a.8.8 0 0 0-1.131-1.131L10 7.738 6.783 4.521A.8.8 0 1 0 5.652 5.652L8.869 8.87l-3.217 3.217a.8.8 0 1 0 1.131 1.131L10 10.001l3.217 3.217a.8.8 0 1 0 1.131-1.131L11.131 8.87l3.217-3.217Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[75vh] overflow-auto px-5 py-4">
                    <div className="grid items-start gap-5 sm:grid-cols-2">
                        {/* Contact */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Contact</div>
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jane@example.com"
                                            disabled={saving}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Phone</label>
                                        <input
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="(555) 123-4567"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Roles */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Roles</div>
                            <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                                <ul className="max-h-56 space-y-1 overflow-auto">
                                    {availableRoles.length === 0 ? (
                                        <li className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">No roles available.</li>
                                    ) : (
                                        availableRoles.map((role) => {
                                            const enabled = draftRoles.has(role);
                                            const pendingKey = `${user.id}:${role}`;
                                            const roleBusy = saving || isBusy(pendingKey);

                                            return (
                                                <li key={role}>
                                                    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                                                        <div className="min-w-0">
                                                            <span className="block text-sm text-slate-800 dark:text-slate-200">{role}</span>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {role === "Manager" && "Full admin access to settings, users, and billing."}
                                                                {role === "ServiceProvider" && "Manage schedule, reservations, availability."}
                                                                {role === "Client" && "Book appointments and manage reservations."}
                                                                {role !== "Manager" && role !== "ServiceProvider" && role !== "Client" && "Role details forthcoming."}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {roleBusy && (
                                                                <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" aria-hidden="true">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                                </svg>
                                                            )}
                                                            <Toggle
                                                                enabled={enabled}
                                                                onToggle={() => toggleRole(role)}
                                                                ariaLabel={`Toggle ${role} role`}
                                                                disabled={roleBusy}
                                                            />
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </div>
                        </section>
                    </div>

                    <div className="my-4 rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                        The sections below are placeholders for future features.
                    </div>

                    <div className="grid items-start gap-5 sm:grid-cols-2">
                        {/* Notifications + Birthday */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Notifications &amp; Birthday</div>
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 opacity-50">
                                        <input type="checkbox" disabled /> <span className="text-sm text-slate-800 dark:text-slate-200">Email reminders</span>
                                    </label>
                                    <label className="flex items-center gap-2 opacity-50">
                                        <input type="checkbox" disabled /> <span className="text-sm text-slate-800 dark:text-slate-200">SMS reminders</span>
                                    </label>
                                    <div className="pt-1">
                                        <label className="mb-1 block text-xs font-medium text-slate-600 opacity-50 dark:text-slate-300">Birthday</label>
                                        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" type="date" disabled />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Waivers / Packages / Payment / History */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Waivers, Packages &amp; More</div>
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <div className="grid gap-2">
                                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                        Upload waiver
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                            Assign package
                                        </button>
                                        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                            Create package
                                        </button>
                                    </div>
                                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                        Manage payment method
                                    </button>
                                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                        View appointment history
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                        onClick={() => void handleSave()}
                        disabled={saving || !hasChanges}
                        title={!hasChanges ? "No changes to save" : undefined}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
