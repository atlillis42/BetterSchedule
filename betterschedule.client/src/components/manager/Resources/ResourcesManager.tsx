import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@auth/auth-context";
import { isManager } from "@auth/roles";
import { getResources, deleteResource } from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";
import ResourcesModal from "./ResourcesModal";

export default function ResourcesManager() {
    const { roles } = useAuth();
    const canAccess = isManager(roles);

    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [search, setSearch] = useState<string>("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editing, setEditing] = useState<CalendarResource | null>(null);

    const load = async () => {
        try {
            setIsLoading(true);
            const data = await getResources();
            setResources(data);
        } catch {
            toast.error("Failed to load resources.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return resources;
        const q = search.toLowerCase();
        return resources.filter((r) => r.name.toLowerCase().includes(q));
    }, [resources, search]);

    function startCreate() {
        setEditing(null);
        setModalMode("create");
        setIsModalOpen(true);
    }

    function startEdit(r: CalendarResource) {
        setEditing(r);
        setModalMode("edit");
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditing(null);
    }

    async function handleSaved() {
        await load();
        closeModal();
    }

    function handleDelete(id: number) {
        if (!window.confirm("Delete this resource?")) return;
        void (async () => {
            try {
                await deleteResource(id);
                await load();
                toast.success("Resource deleted.");
            } catch {
                toast.error("Failed to delete resource.");
            }
        })();
    }

    if (!canAccess) {
        return (
            <div className="p-6">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                        You do not have access to manage resources.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mx-auto max-w-6xl space-y-4">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Calendar Resources</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Create and manage resources used on the calendar. More controls (like blocked time) are{" "}
                            <span className="font-medium">coming soon</span>.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-900">
                            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <path
                                    fillRule="evenodd"
                                    d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <input
                                className="ml-2 w-48 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder-slate-400"
                                placeholder="Search resources"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search resources"
                            />
                        </div>
                        <button
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                            onClick={startCreate}
                        >
                            + New
                        </button>
                    </div>
                </div>

                {/* Table / Cards */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    {isLoading ? (
                        <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700/50" />
                            <p className="text-sm text-slate-600 dark:text-slate-300">No resources yet.</p>
                            <button
                                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                                onClick={startCreate}
                            >
                                Create one
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block">
                                <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                                            <th className="sticky top-0 z-10 w-[70%] border-b border-slate-200 px-4 py-3 font-medium dark:border-slate-700">Name</th>
                                            <th className="sticky top-0 z-10 w-[30%] border-b border-slate-200 px-4 py-3 dark:border-slate-700"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((r) => (
                                            <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                                            onClick={() => startEdit(r)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                                            onClick={() => handleDelete(r.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden">
                                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filtered.map((r) => (
                                        <li key={r.id} className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-base font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                                        onClick={() => startEdit(r)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                                        onClick={() => handleDelete(r.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <ResourcesModal
                open={isModalOpen}
                mode={modalMode}
                initial={editing ?? undefined}
                onClose={closeModal}
                onSaved={handleSaved}
            />
        </div>
    );
}
