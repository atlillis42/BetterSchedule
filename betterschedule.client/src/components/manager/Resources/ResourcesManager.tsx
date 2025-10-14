import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@auth/auth-context";
import { isManager } from "@auth/roles";
import {
    getResources,
    deleteResource,
} from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";
import ResourcesModal from "./ResourcesModal";

/**
 * @file ResourcesManager.tsx
 * @summary Manager UI for calendar resources with modal-based create/edit and responsive list.
 * @remarks
 * - Shows a searchable list of resources.
 * - Create/Edit handled in a centered modal (single success toast there).
 * - This UI intentionally omits color/backColor and blocked-time editing for now.
 */

/**
 * Resources manager page content: list, search, and CRUD via modal.
 * @returns JSX element for the manager content.
 */
export default function ResourcesManager() {
    const { roles } = useAuth();
    const canAccess = isManager(roles); // Manager-only for now

    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [search, setSearch] = useState<string>("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editing, setEditing] = useState<CalendarResource | null>(null);

    /** Loads resources from the server. */
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

    /** Filtered list based on search. */
    const filtered = useMemo(() => {
        if (!search.trim()) return resources;
        const q = search.toLowerCase();
        return resources.filter((r) => r.name.toLowerCase().includes(q));
    }, [resources, search]);

    /** Opens the create modal. */
    function startCreate() {
        setEditing(null);
        setModalMode("create");
        setIsModalOpen(true);
    }

    /** Opens the edit modal. */
    function startEdit(r: CalendarResource) {
        setEditing(r);
        setModalMode("edit");
        setIsModalOpen(true);
    }

    /** Closes the modal and clears state. */
    function closeModal() {
        setIsModalOpen(false);
        setEditing(null);
    }

    /** Refresh list and close modal after a successful save (toast is handled in modal). */
    async function handleSaved() {
        await load();
        closeModal();
    }

    /** Deletes a resource with confirmation. */
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
                    <div className="rounded-xl border bg-white/70 p-6 text-sm text-gray-700 shadow-sm">
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
                        <h1 className="text-xl font-semibold text-gray-900">Calendar Resources</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Create and manage resources used on the calendar. More controls (like blocked time) are{" "}
                            <span className="font-medium">coming soon</span>.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border bg-white px-2 py-1.5 shadow-sm">
                            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <path
                                    fillRule="evenodd"
                                    d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <input
                                className="ml-2 w-48 min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                placeholder="Search resources"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search resources"
                            />
                        </div>
                        <button
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                            onClick={startCreate}
                        >
                            + New
                        </button>
                    </div>
                </div>

                {/* Table / Cards */}
                <div className="rounded-xl border bg-white shadow-sm">
                    {isLoading ? (
                        <div className="p-6 text-sm text-gray-600">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100" />
                            <p className="text-sm text-gray-600">No resources yet.</p>
                            <button
                                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
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
                                        <tr className="bg-gray-50 text-left text-gray-600">
                                            <th className="sticky top-0 z-10 w-[70%] border-b px-4 py-3 font-medium">Name</th>
                                            <th className="sticky top-0 z-10 w-[30%] border-b px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((r) => (
                                            <tr key={r.id} className="border-t">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{r.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                            onClick={() => startEdit(r)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
                                <ul className="divide-y">
                                    {filtered.map((r) => (
                                        <li key={r.id} className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-base font-medium text-gray-900">{r.name}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                        onClick={() => startEdit(r)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
