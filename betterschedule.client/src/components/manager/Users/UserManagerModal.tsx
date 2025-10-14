import { useEffect, useState } from "react";
import type { RoleName } from "@/api/user-api";

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
    /** Whether the modal is visible. */
    open: boolean;
    /** Closes the modal. */
    onClose: () => void;
    /** User being edited (or null). */
    user: UserManagerModalUser | null;
    /** Available roles (authoritative from backend or fallback union). */
    availableRoles: readonly RoleName[];
    /**
     * In-flight indicator for a specific `(userId:role)` toggle.
     * Used to disable the checkbox and show a spinner.
     */
    isBusy: (key: string) => boolean;
    /**
     * Toggle role handler (immediate apply). Implemented by the page to call the API.
     * @param userId Target user id.
     * @param role Role name.
     * @param enable True to add, false to remove.
     */
    onToggleRole: (userId: string, role: RoleName, enable: boolean) => Promise<void>;
    /**
     * Demo-only local save for contact fields (email, phone).
     * Page updates local state; backend integration can be added later.
     */
    onSaveLocalContact: (userId: string, email: string, phone: string) => void;
};

/**
 * Users Manager Details Modal.
 * - Roles: interactive (immediate apply via API).
 * - Contact: editable (email/phone) and saved locally (demo).
 * - Placeholders: Notifications, Birthday, Waivers, Packages, Payment, Appointment History (disabled).
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

    const [email, setEmail] = useState<string>(user?.email ?? "");
    const [phone, setPhone] = useState<string>(user?.phone ?? "");

    useEffect(() => {
        setEmail(user?.email ?? "");
        setPhone(user?.phone ?? "");
    }, [user]);

    if (!open || !user) return null;

    function handleSave(): void {
        onSaveLocalContact(user.id, email, phone);
        // Toast handled by page if desired; keep modal generic.
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h2 className="text-base font-semibold">Edit: {user.name}</h2>
                    <button
                        className="rounded p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                            <path
                                d="M14.348 5.652a.8.8 0 0 0-1.131-1.131L10 7.738 6.783 4.521A.8.8 0 1 0 5.652 5.652L8.869 8.87l-3.217 3.217a.8.8 0 1 0 1.131 1.131L10 10.001l3.217 3.217a.8.8 0 1 0 1.131-1.131L11.131 8.87l3.217-3.217Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>

                <div className="px-5 py-4">
                    <div className="mb-4 rounded-lg border border-dashed bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        Features to be added: Notification settings, Birthday, Stored waivers, <strong>Packages</strong>, Payment info, Appointment history. Controls are disabled for now.
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        {/* Contact */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Contact</div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                                <input
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                                <input
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                        </section>

                        {/* Roles */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Roles</div>
                            <div className="rounded-xl border p-2">
                                <ul className="max-h-52 space-y-1 overflow-auto">
                                    {availableRoles.length === 0 ? (
                                        <li className="px-2 py-1 text-xs text-gray-500">No roles available.</li>
                                    ) : (
                                        availableRoles.map((role) => {
                                            const checked = user.roles.includes(role);
                                            const pendingKey = `${user.id}:${role}`;
                                            const disabled = isBusy(pendingKey);
                                            return (
                                                <li key={role}>
                                                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4"
                                                                checked={checked}
                                                                disabled={disabled}
                                                                onChange={(e) => void onToggleRole(user.id, role, e.target.checked)}
                                                            />
                                                            <span className="text-sm text-gray-800">{role}</span>
                                                        </div>
                                                        {disabled && (
                                                            <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                            </svg>
                                                        )}
                                                    </label>
                                                    <p className="px-2 pb-1 text-[11px] text-gray-500">
                                                        {role === "Manager" && "Full admin access to organization settings, users, and billing."}
                                                        {role === "ServiceProvider" && "Can manage their schedule, reservations, and availability."}
                                                        {role === "Client" && "Can book appointments and manage their reservations."}
                                                        {role !== "Manager" && role !== "ServiceProvider" && role !== "Client" && "Role details forthcoming."}
                                                    </p>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </div>
                        </section>

                        {/* Placeholders (disabled) */}
                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Notification Settings</div>
                            <div className="rounded-xl border p-3">
                                <label className="flex items-center gap-2 opacity-50">
                                    <input type="checkbox" disabled /> <span className="text-sm">Email reminders</span>
                                </label>
                                <label className="mt-2 flex items-center gap-2 opacity-50">
                                    <input type="checkbox" disabled /> <span className="text-sm">SMS reminders</span>
                                </label>
                            </div>

                            <div className="text-sm font-medium text-gray-800">Birthday</div>
                            <input className="w-full rounded-lg border px-3 py-2 text-sm opacity-50" type="date" disabled />
                        </section>

                        <section className="space-y-3">
                            <div className="text-sm font-medium text-gray-800">Stored Waivers</div>
                            <div className="rounded-xl border p-3">
                                <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                    Upload waiver
                                </button>
                            </div>

                            <div className="text-sm font-medium text-gray-800">Packages</div>
                            <div className="rounded-xl border p-3">
                                <select className="w-full rounded-lg border px-3 py-2 text-sm opacity-50" disabled>
                                    <option>— Select package —</option>
                                </select>
                                <div className="mt-2 flex gap-2">
                                    <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                        Assign
                                    </button>
                                    <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                        Create package
                                    </button>
                                </div>
                            </div>

                            <div className="text-sm font-medium text-gray-800">Payment Information</div>
                            <div className="rounded-xl border p-3">
                                <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                    Manage payment method
                                </button>
                            </div>

                            <div className="text-sm font-medium text-gray-800">Appointment History</div>
                            <div className="rounded-xl border p-3">
                                <button className="rounded-lg border px-3 py-1.5 text-sm opacity-50" disabled>
                                    View history
                                </button>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
                    <button
                        className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
