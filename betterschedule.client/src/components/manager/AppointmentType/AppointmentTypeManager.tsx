import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@auth/auth-context";
import { isManager, isProvider } from "@auth/roles";
import {
    getAppointmentTypes,
    deleteAppointmentType,
    type AppointmentTypeDto,
} from "@/api/appointmenttype-api";
import { getResources } from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";
import AppointmentTypeModal from "./AppointmentTypeModal";

/**
 * @file AppointmentTypeManager.tsx
 * @summary List/CRUD container for Appointment Types with a create/edit modal.
 * @remarks
 * - Duration formatted without seconds; 15-minute increments by default.
 * - Soft-shaded chips/buttons; Price & Resource columns centered.
 * - Assigned Resource column displays by resolving assignedResourceId -> resource.name.
 */

/** Formats a number as a localized currency (fallback USD). */
function formatCurrency(amount: number | undefined): string {
    const safe = Number.isFinite(amount) ? (amount as number) : 0;
    try {
        return safe.toLocaleString(undefined, { style: "currency", currency: "USD" });
    } catch {
        return `$${safe.toFixed(2)}`;
    }
}

/**
 * Converts "HH:MM:SS" into a short label like "1h 30m" or "45m".
 * Falls back to the input if it cannot parse.
 * @param hhmmss Duration string in "HH:MM:SS".
 */
function formatDurationLabel(hhmmss: string | null | undefined): string {
    if (!hhmmss) return "—";
    const m = /^(\d{2}):([0-5]\d):([0-5]\d)$/.exec(hhmmss);
    if (!m) return hhmmss;
    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes === 0) return "—";
    const h = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (h && mins) return `${h}h ${mins}m`;
    if (h) return `${h}h`;
    return `${mins}m`;
}

/**
 * Appointment Type manager with list, search/filter, and modal-based create/edit.
 * @returns JSX element for the manager content.
 */
export default function AppointmentTypeManager() {
    const { roles, userId } = useAuth();
    const canAccess = isManager(roles) || isProvider(roles);

    const [types, setTypes] = useState<AppointmentTypeDto[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [filterMine, setFilterMine] = useState<boolean>(false);
    const [search, setSearch] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editing, setEditing] = useState<AppointmentTypeDto | null>(null);

    /** Loads appointment types and resources. */
    const load = async () => {
        try {
            setIsLoading(true);
            const [typesResponse, resourcesResponse] = await Promise.all([getAppointmentTypes(), getResources()]);
            setTypes(typesResponse);
            setResources(resourcesResponse);
        } catch {
            toast.error("Failed to load appointment types.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    /** Map of resource id -> name for O(1) lookups. */
    const resourceNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const r of resources) map.set(r.id, r.name);
        return map;
    }, [resources]);

    /** Derived list honoring search and "mine" filter. */
    const filtered = useMemo(() => {
        let list = [...types];
        if (filterMine && userId) list = list.filter((t) => t.createdByUserId === userId);
        if (search.trim()) {
            const query = search.toLowerCase();
            list = list.filter(
                (t) => t.name.toLowerCase().includes(query) || (t.description ?? "").toLowerCase().includes(query)
            );
        }
        return list;
    }, [types, filterMine, search, userId]);

    /** Opens the create modal. */
    function startCreate() {
        setEditing(null);
        setModalMode("create");
        setIsModalOpen(true);
    }

    /** Opens the edit modal for a specific item. */
    function startEdit(item: AppointmentTypeDto) {
        setEditing(item);
        setModalMode("edit");
        setIsModalOpen(true);
    }

    /** Closes the modal and clears editing state. */
    function closeModal() {
        setIsModalOpen(false);
        setEditing(null);
    }

    /** Reloads after save and closes modal (no toast here to avoid double toasts). */
    async function handleSaved() {
        await load();
        closeModal();
    }

    /** Deletes an appointment type with confirmation. */
    function handleDelete(id: number) {
        if (!window.confirm("Delete this appointment type?")) return;
        void (async () => {
            try {
                await deleteAppointmentType(id);
                await load();
                toast.success("Appointment type deleted.");
            } catch {
                toast.error("Failed to delete appointment type.");
            }
        })();
    }

    if (!canAccess) {
        return (
            <div className="p-6">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-xl border bg-white/70 p-6 text-sm text-gray-700 shadow-sm">
                        You do not have access to manage appointment types.
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
                        <h1 className="text-xl font-semibold text-gray-900">Appointment Types</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Define the services your organization offers. Scope to specific providers is{" "}
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
                                placeholder="Search by name or description"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search appointment types"
                            />
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={filterMine}
                                onChange={(e) => setFilterMine(e.target.checked)}
                            />
                            Show mine
                        </label>
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
                            <p className="text-sm text-gray-600">No appointment types yet.</p>
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
                                            <th className="sticky top-0 z-10 w-[30%] border-b px-4 py-3 font-medium">Name</th>
                                            <th className="sticky top-0 z-10 w-[12%] border-b px-4 py-3 font-medium">
                                                Duration
                                            </th>
                                            <th className="sticky top-0 z-10 w-[14%] border-b px-4 py-3 text-center font-medium">
                                                Price
                                            </th>
                                            <th className="sticky top-0 z-10 w-[18%] border-b px-4 py-3 text-center font-medium">
                                                Assigned Resource
                                            </th>
                                            <th className="sticky top-0 z-10 w-[14%] border-b px-4 py-3 font-medium">Scope</th>
                                            <th className="sticky top-0 z-10 w-[12%] border-b px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((t) => {
                                            const resName =
                                                t.assignedResourceId != null
                                                    ? resourceNameById.get(t.assignedResourceId) ?? "—"
                                                    : "—";
                                            return (
                                                <tr key={t.id} className="border-t">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{t.name}</div>
                                                        {t.description ? (
                                                            <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                                                {t.description}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3">{formatDurationLabel(t.duration)}</td>
                                                    <td className="px-4 py-3 text-center">{formatCurrency(t.price)}</td>
                                                    <td className="px-4 py-3 text-center">{resName}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                            title="Provider scoping coming soon"
                                                        >
                                                            All providers
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                                onClick={() => startEdit(t)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                                onClick={() => handleDelete(t.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden">
                                <ul className="divide-y">
                                    {filtered.map((t) => {
                                        const resName =
                                            t.assignedResourceId != null
                                                ? resourceNameById.get(t.assignedResourceId) ?? "—"
                                                : "—";
                                        return (
                                            <li key={t.id} className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-base font-medium text-gray-900">{t.name}</div>
                                                        {t.description ? (
                                                            <div className="mt-1 text-xs text-gray-600">{t.description}</div>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                            onClick={() => startEdit(t)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                            onClick={() => handleDelete(t.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-700">
                                                    <div>
                                                        <div className="text-gray-500">Duration</div>
                                                        <div className="font-medium">{formatDurationLabel(t.duration)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-gray-500">Price</div>
                                                        <div className="font-medium">{formatCurrency(t.price)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-500">Assigned Resource</div>
                                                        <div className="font-medium">{resName}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-gray-500">Scope</div>
                                                        <div className="font-medium" title="Provider scoping coming soon">
                                                            All providers
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <AppointmentTypeModal
                open={isModalOpen}
                mode={modalMode}
                initial={editing ?? undefined}
                resources={resources}
                onClose={closeModal}
                onSaved={handleSaved}
            />
        </div>
    );
}
