import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@auth/auth-context";
import {
    listOrgs,
    joinOrg,
    createOrg,
    type OrganizationLite,
} from "@/api/organizations-api";

/**
 * Lets a logged-in user pick an organization to join (as Client)
 * or create a new organization (becoming Manager).
 *
 * Behavior:
 * - If the user already has an organization, auto-redirects to /calendar.
 * - Lists organizations with optional search.
 * - Join: POST /orgs/join/{organizationId} + refresh auth -> /calendar
 * - Create: POST /orgs/create { name } + refresh auth -> /calendar
 */
const JoinOrganization: React.FC = () => {
    const navigate = useNavigate();
    const { organizationId, refreshAuth } = useAuth();

    const [orgs, setOrgs] = useState<OrganizationLite[]>([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<string | null>(null);

    // Create form
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    // If the user already belongs to an org, bounce to the app
    useEffect(() => {
        if (organizationId) navigate("/calendar", { replace: true });
    }, [organizationId, navigate]);

    // Load orgs (initial + whenever q changes after a debounce)
    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            try {
                const data = await listOrgs(q.trim() || undefined);
                if (!cancelled) setOrgs(data);
            } catch (err: any) {
                if (!cancelled) toast.error(err?.message || "Failed to load organizations.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const t = setTimeout(run, 250); // small debounce for typing
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [q]);

    const canCreate = useMemo(() => newName.trim().length > 0 && newName.trim().length <= 128, [newName]);

    const handleJoin = async (id: string) => {
        setJoining(id);
        try {
            await joinOrg(id);
            await refreshAuth();
            toast.success("Joined organization.");
            navigate("/calendar");
        } catch (err: any) {
            toast.error(err?.message || "Join failed.");
        } finally {
            setJoining(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;

        setCreating(true);
        try {
            await createOrg(name);
            await refreshAuth();
            toast.success("Organization created.");
            navigate("/calendar");
        } catch (err: any) {
            toast.error(err?.message || "Create failed.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center">
            <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
                <header className="space-y-1">
                    <h1 className="text-xl font-semibold">Choose or create an organization</h1>
                    <p className="text-sm text-gray-600">
                        Join an existing organization as a <b>Client</b>, or create a new one to become its <b>Manager</b>.
                    </p>
                </header>

                {/* Search + list */}
                <section className="rounded-xl border bg-white">
                    <div className="p-4 border-b flex items-center gap-3">
                        <label htmlFor="orgSearch" className="sr-only">Search organizations</label>
                        <input
                            id="orgSearch"
                            name="q"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search organizations…"
                            className="w-full border rounded px-3 py-2"
                            autoComplete="off"
                        />
                    </div>

                    {loading ? (
                        <div className="p-4 text-sm text-gray-600">Loading organizations…</div>
                    ) : orgs.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No organizations found.</div>
                    ) : (
                        <ul className="divide-y">
                            {orgs.map((o) => (
                                <li key={o.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <div className="font-medium">{o.name}</div>
                                        <div className="text-[11px] text-gray-500">{o.id}</div>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(o.id)}
                                        disabled={joining === o.id}
                                        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                                    >
                                        {joining === o.id ? "Joining…" : "Join as Client"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Create new org */}
                <section className="rounded-xl border bg-white p-4">
                    <form onSubmit={handleCreate} className="flex flex-col gap-3 md:flex-row md:items-center" noValidate>
                        <label className="grow" htmlFor="organizationName">
                            <span className="block text-sm mb-1">New organization name</span>
                            <input
                                id="organizationName"
                                name="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Acme Wellness"
                                className="w-full border rounded px-3 py-2"
                                maxLength={128}
                                autoComplete="organization"
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={!canCreate || creating}
                            className="bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50"
                            title="Create a new organization (you will become its Manager)"
                        >
                            {creating ? "Creating…" : "Create Organization"}
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">
                        You’ll become the <b>Manager</b> of the newly created organization.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default JoinOrganization;
