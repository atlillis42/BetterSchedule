import { useEffect, useState } from "react";
import { getUsers, addUserRole, removeUserRole, type UserDto } from "@/api/user-api";
import { toast } from "react-toastify";

const ALL_ROLES = ["Manager", "ServiceProvider", "Client"] as const;

/**
 * Admin UI for managing user roles.
 */
export default function UserRoleManager() {
    const [users, setUsers] = useState<UserDto[]>([]);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            setBusy(true);
            const data = await getUsers();
            setUsers(data);
        } catch (e: any) {
            toast.error(e?.response?.data ?? "Failed to load users");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleRole = async (userId: string, role: string, enabled: boolean) => {
        try {
            if (enabled) {
                await addUserRole(userId, role);
            } else {
                await removeUserRole(userId, role);
            }
            setUsers((us) =>
                us.map((u) =>
                    u.id === userId
                        ? {
                            ...u,
                            roles: enabled
                                ? [...u.roles, role]
                                : u.roles.filter((r) => r !== role),
                        }
                        : u
                )
            );
            toast.success("Saved");
        } catch (e: any) {
            toast.error(e?.response?.data ?? "Update failed");
        }
    };

    return (
        <div className="p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">Users</h1>
                <button
                    className="btn px-4 py-2 rounded bg-gray-100 border disabled:opacity-50"
                    onClick={load}
                    disabled={busy}
                >
                    Refresh
                </button>
            </header>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="text-left border-b">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Username</th>
                        <th className="py-2 pr-4">Email</th>
                        {ALL_ROLES.map((r) => (
                            <th key={r} className="py-2 pr-4">
                                {r}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">{u.name}</td>
                            <td className="py-2 pr-4">{u.userName ?? ""}</td>
                            <td className="py-2 pr-4">{u.email ?? ""}</td>
                            {ALL_ROLES.map((r) => (
                                <td key={r} className="py-2 pr-4">
                                    <input
                                        type="checkbox"
                                        checked={u.roles.includes(r)}
                                        onChange={(e) => toggleRole(u.id, r, e.target.checked)}
                                        disabled={busy}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}