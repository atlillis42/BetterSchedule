import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getUsers, addUserRole, removeUserRole, type UserDto } from "@/api/user-api";
import { useAuth } from "@auth/AuthContext";

const ALL_ROLES = ["Manager", "ServiceProvider", "Client"] as const;

type RoleName = typeof ALL_ROLES[number];

/**
 * Extracts a user-friendly message from Axios errors that use `{ code, message }`.
 * Falls back to a provided string when the payload is not present.
 */
function friendlyError(err: unknown, fallback: string): string {
    const anyErr = err as any;
    const data = anyErr?.response?.data;
    if (typeof data === "string") return data;
    const msg = data?.message ?? anyErr?.message ?? fallback;
    return typeof msg === "string" ? msg : fallback;
}

/**
 * Admin UI for managing organization user roles.
 * Presents users with current roles and allows toggling the allowed set:
 * Manager, ServiceProvider, Client.
 *
 * @remarks
 * - Only Managers may access this page (guarded via `useAuth()`).
 * - Each checkbox updates the server and then reflects the change locally.
 * - Individual toggles show a “pending” state to prevent double submits.
 * - Errors are reported in-context via toasts; no global interceptor toasts.
 */
export default function UserRoleManager() {
    const { isManager } = useAuth();

    /** Users loaded from the server. */
    const [users, setUsers] = useState<UserDto[]>([]);
    /** Overall loading state for (re)fetching the user list. */
    const [loading, setLoading] = useState(true);
    /**
     * Set of `userId:role` keys that are in-flight.
     * Prevents double submits and keeps the rest of the table usable.
     */
    const [pending, setPending] = useState<Set<string>>(new Set());

    const pendingHas = (key: string) => pending.has(key);

    /** Map of userId → user for O(1) lookups if needed later. */
    const usersById = useMemo(() => {
        const m = new Map<string, UserDto>();
        users.forEach(u => m.set(u.id, u));
        return m;
    }, [users]);

    /** Loads users and roles for the current organization. */
    async function load(): Promise<void> {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            toast.error(friendlyError(err, "Failed to load users."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    /**
     * Adds or removes a role for a specific user, updating the table after the API succeeds.
     * @param userId Target user identifier.
     * @param role Role to toggle.
     * @param enable When true, add the role; when false, remove the role.
     */
    async function toggleRole(userId: string, role: RoleName, enable: boolean): Promise<void> {
        const key = `${userId}:${role}`;
        if (pendingHas(key)) return;

        setPending(prev => new Set(prev).add(key));
        try {
            if (enable) {
                await addUserRole(userId, role);
            } else {
                await removeUserRole(userId, role);
            }

            // Apply result to local state after the server confirms the change
            setUsers(prev =>
                prev.map(u => {
                    if (u.id !== userId) return u;
                    const nextRoles = enable
                        ? Array.from(new Set([...u.roles, role]))
                        : u.roles.filter(r => r !== role);
                    return { ...u, roles: nextRoles };
                })
            );

            toast.success("Saved.");
        } catch (err) {
            toast.error(friendlyError(err, "Update failed."));
        } finally {
            setPending(prev => {
                const copy = new Set(prev);
                copy.delete(key);
                return copy;
            });
        }
    }

    if (!isManager) {
        return (
            <div className="p-6 text-sm text-gray-700">
                You don’t have permission to view this page.
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">Users</h1>
                <button
                    className="px-4 py-2 rounded bg-gray-100 border disabled:opacity-50"
                    onClick={() => void load()}
                    disabled={loading}
                >
                    {loading ? "Refreshing…" : "Refresh"}
                </button>
            </header>

            <div className="overflow-auto rounded border bg-white">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left border-b bg-gray-50">
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Username</th>
                            <th className="py-2 px-3">Email</th>
                            {ALL_ROLES.map(r => (
                                <th key={r} className="py-2 px-3">{r}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td className="py-3 px-3 text-gray-500" colSpan={3 + ALL_ROLES.length}>
                                    {loading ? "Loading…" : "No users found."}
                                </td>
                            </tr>
                        ) : (
                            users.map(u => (
                                <tr key={u.id} className="border-b last:border-0">
                                    <td className="py-2 px-3">{u.name}</td>
                                    <td className="py-2 px-3">{u.userName ?? ""}</td>
                                    <td className="py-2 px-3">{u.email ?? ""}</td>
                                    {ALL_ROLES.map(role => {
                                        const checked = u.roles.includes(role);
                                        const key = `${u.id}:${role}`;
                                        const disabled = pendingHas(key) || loading;
                                        return (
                                            <td key={role} className="py-2 px-3">
                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={e => void toggleRole(u.id, role, e.target.checked)}
                                                    />
                                                    <span className="text-xs text-gray-600">{role}</span>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
