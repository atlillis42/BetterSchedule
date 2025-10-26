import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
    getUsers,
    addUserRole,
    removeUserRole,
    getAvailableRoles,
    type UserDto,
    type RoleName,
} from "@/api/user-api";
import { useAuth } from "@auth/auth-context";
import UserManagerModal from "./UserManagerModal";

function friendlyError(err: unknown, fallback: string): string {
    const anyErr = err as any;
    const data = anyErr?.response?.data;
    if (typeof data === "string") return data;
    const msg = data?.message ?? anyErr?.message ?? fallback;
    return typeof msg === "string" ? msg : fallback;
}

type UserRow = UserDto & {
    isLocalPlaceholder?: boolean;
    phone?: string | null;
};

function randomCode(length = 10): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
}

const SESSION_PLACEHOLDERS_KEY = "userManager.placeholders";
function readPlaceholders(): UserRow[] {
    try {
        const raw = sessionStorage.getItem(SESSION_PLACEHOLDERS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as UserRow[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
function writePlaceholders(next: UserRow[]): void {
    try {
        sessionStorage.setItem(SESSION_PLACEHOLDERS_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
}
function upsertPlaceholder(row: UserRow): void {
    const list = readPlaceholders();
    const next = [row, ...list.filter((r) => r.id !== row.id)];
    writePlaceholders(next);
}
function patchPlaceholder(userId: string, patch: Partial<UserRow>): void {
    const list = readPlaceholders();
    const next = list.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    writePlaceholders(next);
}

/** Invite Link Modal (demo) */
function CreateInviteLinkModal(props: {
    open: boolean;
    onClose: () => void;
    availableRoles: readonly RoleName[];
}) {
    const { open, onClose, availableRoles } = props;
    const [selectedRole, setSelectedRole] = useState<RoleName>(availableRoles[0] ?? "Client");
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (availableRoles.length > 0 && !availableRoles.includes(selectedRole)) {
            setSelectedRole(availableRoles[0]);
        }
    }, [availableRoles, selectedRole]);

    if (!open) return null;

    function handleGenerate(): void {
        const code = randomCode(12);
        const url = `${window.location.origin}/join?role=${encodeURIComponent(selectedRole)}&code=${code}`;
        setGeneratedUrl(url);
    }

    function handleCopy(): void {
        if (!generatedUrl) return;
        void navigator.clipboard
            .writeText(generatedUrl)
            .then(() => toast.success("Invite link copied."))
            .catch(() => toast.error("Failed to copy."));
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="bs-modal w-full max-w-lg rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <h2 className="text-base font-semibold">Create Invite Link</h2>
                    <button
                        className="rounded p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
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
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Role for invite</label>
                            <select
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as RoleName)}
                            >
                                {availableRoles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Generates a shareable link for someone to join this organization with the selected role. (Demo only)
                            </p>
                        </div>

                        {generatedUrl && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-100">
                                <div className="mb-1 font-medium">Invite Link</div>
                                <div className="break-all">{generatedUrl}</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                        onClick={generatedUrl ? handleCopy : handleGenerate}
                    >
                        {generatedUrl ? "Copy Link" : "Generate"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Add Placeholder Client Modal (demo) */
function AddPlaceholderClientModal(props: {
    open: boolean;
    onClose: () => void;
    onAdded: (row: UserRow) => void;
}) {
    const { open, onClose, onAdded } = props;
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    if (!open) return null;

    function newTempId(): string {
        const anyCrypto = crypto as any;
        return `temp-${anyCrypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    }

    async function handleCreate(): Promise<void> {
        setSubmitting(true);
        try {
            const resp = await fetch("/api/users/placeholder-client", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fullName || "Placeholder Client",
                    email: email || null,
                }),
            });

            if (resp.ok) {
                const created = (await resp.json()) as UserDto;
                onAdded({ ...created, isLocalPlaceholder: false });
                toast.success("Placeholder client created.");
                onClose();
                return;
            }
        } catch {
            // swallow
        } finally {
            setSubmitting(false);
        }

        const temp: UserRow = {
            id: newTempId(),
            name: fullName || "Placeholder Client",
            email: email || "",
            userName: undefined,
            roles: ["Client"],
            isLocalPlaceholder: true,
            phone: null,
        };
        onAdded(temp);
        toast.info("Added local-only placeholder client (not saved to server).");
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="bs-modal w-full max-w-lg rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <h2 className="text-base font-semibold">Add Placeholder Client</h2>
                    <button
                        className="rounded p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
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
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Jane Client"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email (optional)</label>
                            <input
                                type="email"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jane@example.com"
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Creates a lightweight client for demo purposes. Link to a real user later when they sign up or accept an invite.
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                        onClick={() => void handleCreate()}
                        disabled={submitting}
                    >
                        {submitting ? "Creating…" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UserManager() {
    const { isManager } = useAuth();

    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");
    const [availableRoles, setAvailableRoles] = useState<readonly RoleName[]>([]);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsUser, setDetailsUser] = useState<UserRow | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [addClientOpen, setAddClientOpen] = useState(false);

    const isBusy = (key: string) => pending.has(key);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => {
            const hay = `${u.name ?? ""} ${u.email ?? ""} ${u.roles.join(" ")}`.toLowerCase();
            return hay.includes(q);
        });
    }, [users, query]);

    function unionRoles(list: UserRow[]): RoleName[] {
        const s = new Set<RoleName>();
        list.forEach((u) => u.roles.forEach((r) => s.add(r)));
        return Array.from(s).sort((a, b) => a.localeCompare(b));
    }

    async function load(): Promise<void> {
        setLoading(true);
        try {
            let roles: RoleName[] = [];
            try {
                roles = await getAvailableRoles();
            } catch {
                // ignore
            }

            const data = await getUsers();
            const serverUsers: UserRow[] = (data as UserRow[]).map((u) => ({
                ...u,
                phone: u.phone ?? null,
                isLocalPlaceholder: false,
            }));
            const placeholders = readPlaceholders();

            const byId = new Map<string, UserRow>();
            serverUsers.forEach((u) => byId.set(u.id, u));
            placeholders.forEach((p) => byId.set(p.id, { ...p, isLocalPlaceholder: true }));

            const merged = Array.from(byId.values());
            setUsers(merged);

            if (roles.length === 0) roles = unionRoles(merged);
            setAvailableRoles(roles);
        } catch (err) {
            toast.error(friendlyError(err, "Failed to load users/roles."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function toggleRole(userId: string, role: RoleName, enable: boolean): Promise<void> {
        const key = `${userId}:${role}`;
        if (isBusy(key)) return;

        setPending((prev) => new Set(prev).add(key));
        try {
            const target = users.find((u) => u.id === userId);
            const isLocal = target?.isLocalPlaceholder === true;

            if (!isLocal) {
                if (enable) await addUserRole(userId, role);
                else await removeUserRole(userId, role);
            }

            setUsers((prev) =>
                prev.map((u) => {
                    if (u.id !== userId) return u;
                    const nextRoles = enable
                        ? Array.from(new Set([...u.roles, role]))
                        : u.roles.filter((r) => r !== role);

                    if (u.isLocalPlaceholder) {
                        patchPlaceholder(userId, { roles: nextRoles });
                    }
                    return { ...u, roles: nextRoles };
                })
            );

            toast.success("Saved.");
        } catch (err) {
            toast.error(friendlyError(err, "Update failed."));
        } finally {
            setPending((prev) => {
                const copy = new Set(prev);
                copy.delete(key);
                return copy;
            });
        }
    }

    function handleSaveLocalContact(userId: string, email: string, phone: string) {
        setUsers((prev) =>
            prev.map((u) => {
                if (u.id !== userId) return u;
                if (u.isLocalPlaceholder) {
                    patchPlaceholder(userId, { email, phone });
                }
                return { ...u, email, phone };
            })
        );
    }

    if (!isManager) {
        return <div className="p-6 text-sm text-slate-700 dark:text-slate-200">You don’t have permission to view this page.</div>;
    }

    return (
        <div className="p-6">
            <div className="mx-auto w-full max-w-3xl">
                {/* Header / Actions */}
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Manage members, roles, and demo invites/clients.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            onClick={() => void load()}
                            disabled={loading}
                        >
                            {loading ? "Refreshing…" : "Refresh"}
                        </button>
                        <button
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setAddClientOpen(true)}
                        >
                            + Add Placeholder Client
                        </button>
                        <button
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                            onClick={() => setInviteOpen(true)}
                        >
                            Create Invite Link
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mb-3 flex items-center gap-3">
                    <div className="relative grow">
                        <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                            placeholder="Search by name, email, or role…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400">
                            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                                <path
                                    d="M12.9 14.32a7 7 0 1 1 1.414-1.414l3.39 3.388a1 1 0 0 1-1.415 1.415l-3.39-3.389zM14 8a6 6 0 1 0-12 0 6 6 0 0 0 12 0z"
                                    fill="currentColor"
                                />
                            </svg>
                        </span>
                    </div>
                </div>

                {/* Table (md+) */}
                <div className="hidden overflow-auto rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:block">
                    <table className="w-full border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr className="sticky top-0 text-left">
                                <th className="bg-slate-50 px-3 py-2 font-medium text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">Name</th>
                                <th className="bg-slate-50 px-3 py-2 font-medium text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">Roles</th>
                                <th className="bg-slate-50 px-3 py-2 font-medium text-slate-600 dark:bg-slate-900/40 dark:text-slate-300"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td className="px-3 py-6 text-slate-500 dark:text-slate-400" colSpan={3}>
                                        {loading ? "Loading…" : "No users found."}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u, idx) => (
                                    <tr key={u.id} className={idx !== filtered.length - 1 ? "border-b border-slate-200 dark:border-slate-700" : ""}>
                                        <td className="px-3 py-2 align-top">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                    {u.name}
                                                    {u.isLocalPlaceholder && (
                                                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-500/30">
                                                            Local-only
                                                        </span>
                                                    )}
                                                </span>
                                                {u.email && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <div className="flex flex-wrap items-center gap-1">
                                                {u.roles.length === 0 ? (
                                                    <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-600 dark:text-slate-400">
                                                        No roles
                                                    </span>
                                                ) : (
                                                    u.roles.map((r) => (
                                                        <span
                                                            key={r}
                                                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30"
                                                        >
                                                            {r}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-top text-right">
                                            <button
                                                className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
                                                aria-label="More"
                                                onClick={() => {
                                                    setDetailsUser(u);
                                                    setDetailsOpen(true);
                                                }}
                                            >
                                                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                                                    <path
                                                        d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"
                                                        fill="currentColor"
                                                    />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Cards (sm) */}
                <div className="grid gap-3 md:hidden">
                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            {loading ? "Loading…" : "No users found."}
                        </div>
                    ) : (
                        filtered.map((u) => (
                            <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                <div className="mb-2 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                                            {u.name}{" "}
                                            {u.isLocalPlaceholder && (
                                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-500/30">
                                                    Local-only
                                                </span>
                                            )}
                                        </div>
                                        {u.email && <div className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</div>}
                                    </div>
                                    <button
                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
                                        aria-label="More"
                                        onClick={() => {
                                            setDetailsUser(u);
                                            setDetailsOpen(true);
                                        }}
                                    >
                                        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                                            <path
                                                d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-1">
                                    <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Roles</div>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {u.roles.length === 0 ? (
                                            <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-600 dark:text-slate-400">
                                                No roles
                                            </span>
                                        ) : (
                                            u.roles.map((r) => (
                                                <span
                                                    key={r}
                                                    className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30"
                                                >
                                                    {r}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Details Modal */}
            <UserManagerModal
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                user={detailsUser}
                availableRoles={availableRoles}
                isBusy={isBusy}
                onToggleRole={toggleRole}
                onSaveLocalContact={handleSaveLocalContact}
            />

            {/* Demo Modals */}
            <CreateInviteLinkModal open={inviteOpen} onClose={() => setInviteOpen(false)} availableRoles={availableRoles} />
            <AddPlaceholderClientModal
                open={addClientOpen}
                onClose={() => setAddClientOpen(false)}
                onAdded={(row) => {
                    if (row.isLocalPlaceholder) {
                        upsertPlaceholder(row);
                    }
                    setUsers((prev) => [row, ...prev.filter((u) => u.id !== row.id)]);
                }}
            />
        </div>
    );
}
