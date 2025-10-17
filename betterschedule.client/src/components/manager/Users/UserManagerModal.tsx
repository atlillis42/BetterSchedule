import { useEffect, useMemo, useState } from "react";
import type { RoleName } from "@/api/user-api";
import { toast } from "react-toastify";

/** Minimal user row contract shared with the page (mirrors local UserRow). */
export type UserManagerModalUser = {
    id: string;
    name: string;
    email?: string | null;
    roles: string[];
    phone?: string | null;
};

/** Props for the UserManager modal component. */
export type UserManagerModalProps = {
    open: boolean;
    onClose: () => void;
    user: UserManagerModalUser | null;
    availableRoles: readonly RoleName[];
    /** In-flight indicator for a specific `(userId:role)` toggle. */
    isBusy: (key: string) => boolean;
    /**
     * Apply a role change (called in batch on Save).
     * @param userId User id
     * @param role Role name
     * @param enable Add (true) or remove (false)
     */
    onToggleRole: (userId: string, role: RoleName, enable: boolean) => Promise<void>;
    /** Demo-only contact save (local). */
    onSaveLocalContact: (userId: string, email: string, phone: string) => void;
};

/** Small accessible toggle switch. */
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
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition ${enabled ? "bg-blue-600" : "bg-gray-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

/**
 * Users Manager Details Modal.
 * - Roles: edited locally; diffs applied on Save.
 * - Contact: demo-only local save.
 * - Placeholder features moved below a divider, compact layout.
 */
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

    // Contact fields (demo-only persistence)
    const [email, setEmail] = useState<string>(user?.email ?? "");
    const [phone, setPhone] = useState<string>(user?.phone ?? "");

    // Roles snapshot + working copy
    const [initialRoles, setInitialRoles] = useState<readonly RoleName[]>([]);
    const [draftRoles, setDraftRoles] = useState<Set<RoleName>>(new Set());

    // Saving gate
    const [saving, setSaving] = useState(false);

    // Reinitialize when modal opens or target user changes
    useEffect(() => {
        if (!open || !user) return;
        setEmail(user.email ?? "");
        setPhone(user.phone ?? "");
        setInitialRoles([...user.roles] as RoleName[]);
        setDraftRoles(new Set(user.roles as RoleName[]));
    }, [open, user]);

    // Derived data/flags (always computed; no conditional hooks)
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

        // Demo: persist contact locally
        onSaveLocalContact(user.id, (email ?? "").trim(), (phone ?? "").trim());

        // Diff roles vs snapshot
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h2 className="text-base font-semibold">Edit: {user.name}</h2>
                    <button
                        className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
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

                {/* Body (scrollable, compact) */}
                <div className="max-h-[75vh] overflow-auto px-5 py-4">
                    {/* Contact + Roles */}
                    <div className="grid items-start gap-5 sm:grid-cols-2">
                        {/* Contact */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Contact</div>
                            <div className="rounded-xl border p-3">
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                                        <input
                                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jane@example.com"
                                            disabled={saving}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                                        <input
                                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
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
                            <div className="text-sm font-medium text-gray-800">Roles</div>
                            <div className="rounded-xl border p-2">
                                <ul className="max-h-56 space-y-1 overflow-auto">
                                    {availableRoles.length === 0 ? (
                                        <li className="px-2 py-1 text-xs text-gray-500">No roles available.</li>
                                    ) : (
                                        availableRoles.map((role) => {
                                            const enabled = draftRoles.has(role);
                                            const pendingKey = `${user.id}:${role}`;
                                            const roleBusy = saving || isBusy(pendingKey);

                                            return (
                                                <li key={role}>
                                                    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                                                        <div className="min-w-0">
                                                            <span className="block text-sm text-gray-800">{role}</span>
                                                            <p className="text-[11px] text-gray-500">
                                                                {role === "Manager" && "Full admin access to settings, users, and billing."}
                                                                {role === "ServiceProvider" && "Manage schedule, reservations, availability."}
                                                                {role === "Client" && "Book appointments and manage reservations."}
                                                                {role !== "Manager" && role !== "ServiceProvider" && role !== "Client" && "Role details forthcoming."}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {roleBusy && (
                                                                <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
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

                    {/* Divider before placeholders */}
                    <div className="my-4 rounded-lg border border-dashed bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        The sections below are placeholders for future features.
                    </div>

                    {/* Compact placeholder area (two concise cards) */}
                    <div className="grid items-start gap-5 sm:grid-cols-2">
                        {/* Notifications + Birthday */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Notifications &amp; Birthday</div>
                            <div className="rounded-xl border p-3">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 opacity-50">
                                        <input type="checkbox" disabled /> <span className="text-sm">Email reminders</span>
                                    </label>
                                    <label className="flex items-center gap-2 opacity-50">
                                        <input type="checkbox" disabled /> <span className="text-sm">SMS reminders</span>
                                    </label>
                                    <div className="pt-1">
                                        <label className="mb-1 block text-xs font-medium text-gray-600 opacity-50">
                                            Birthday
                                        </label>
                                        <input className="w-full rounded-lg border px-3 py-2 text-sm opacity-50" type="date" disabled />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Waivers / Packages / Payment / History */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Waivers, Packages &amp; More</div>
                            <div className="rounded-xl border p-3">
                                <div className="grid gap-2">
                                    <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                        Upload waiver
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                            Assign package
                                        </button>
                                        <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                            Create package
                                        </button>
                                    </div>
                                    <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                        Manage payment method
                                    </button>
                                    <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                        View appointment history
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
                    <button
                        className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
