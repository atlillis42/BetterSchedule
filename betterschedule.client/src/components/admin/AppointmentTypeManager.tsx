import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@auth/auth-context";
import { isManager, isProvider } from "@auth/roles";
import {
    getAppointmentTypes,
    createAppointmentType,
    updateAppointmentType,
    deleteAppointmentType,
    type AppointmentTypeDto,
    type CreateAppointmentTypeDto,
    type UpdateAppointmentTypeDto,
} from "@/api/appointmenttype-api";
import { getResources } from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";

const defaultForm: Partial<CreateAppointmentTypeDto> = {
    name: "",
    duration: "01:00:00",
    price: 0,
    description: "",
    isPublic: true,
    requiresWaiver: false,
    assignedResourceId: undefined,
};

export default function AppointmentTypeManager() {
    const { roles, userId } = useAuth();
    const canAccess = isManager(roles) || isProvider(roles);

    const [types, setTypes] = useState<AppointmentTypeDto[]>([]);
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [editing, setEditing] = useState<Partial<CreateAppointmentTypeDto & UpdateAppointmentTypeDto> | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filterMine, setFilterMine] = useState<boolean>(false);
    const [search, setSearch] = useState("");

    const load = async () => {
        const [t, r] = await Promise.all([getAppointmentTypes(), getResources()]);
        setTypes(t);
        setResources(r);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        let list = [...types];
        if (filterMine && userId) list = list.filter((t) => t.createdByUserId === userId);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [types, filterMine, search, userId]);

    if (!canAccess) return <div className="p-4 text-sm text-gray-600">You do not have access to manage appointment types.</div>;

    const startCreate = () => {
        setEditing({ ...defaultForm });
        setEditingId(null);
    };
    const startEdit = (t: AppointmentTypeDto) => {
        setEditing({
            name: t.name,
            duration: t.duration,
            price: t.price,
            description: t.description ?? "",
            isPublic: t.isPublic,
            requiresWaiver: t.requiresWaiver,
            assignedResourceId: t.assignedResourceId ?? undefined,
        });
        setEditingId(t.id);
    };

    const handleSave = async () => {
        if (!editing) return;

        try {
            if (editingId) {
                await updateAppointmentType(editingId, editing as UpdateAppointmentTypeDto);
                toast.success("Updated!");
            } else {
                // Server stamps organization + createdByUserId
                await createAppointmentType(editing as CreateAppointmentTypeDto);
                toast.success("Created!");
            }
            setEditing(null);
            setEditingId(null);
            load();
        } catch {
            toast.error("Failed to save.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this appointment type?")) return;
        await deleteAppointmentType(id);
        load();
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Appointment Types</h2>
                <div className="flex items-center gap-2">
                    <input
                        className="border rounded p-2 text-sm"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={filterMine} onChange={(e) => setFilterMine(e.target.checked)} />
                        Show mine
                    </label>
                    <button className="bg-blue-600 text-white px-3 py-1.5 rounded" onClick={startCreate}>
                        + New
                    </button>
                </div>
            </div>

            <table className="w-full border text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Duration</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-left">Resource</th>
                        <th className="p-2 text-left">Owner</th>
                        <th className="p-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((t) => (
                        <tr key={t.id} className="border-t">
                            <td className="p-2">{t.name}</td>
                            <td className="p-2">{t.duration}</td>
                            <td className="p-2 text-right">${t.price.toFixed(2)}</td>
                            <td className="p-2">{t.assignedResourceName ?? "-"}</td>
                            <td className="p-2">{t.createdByUserName ?? t.createdByUserId}</td>
                            <td className="p-2 text-right">
                                <button className="px-2 py-1 border rounded mr-2" onClick={() => startEdit(t)}>
                                    Edit
                                </button>
                                <button className="px-2 py-1 border rounded" onClick={() => handleDelete(t.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {!filtered.length && (
                        <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-500">
                                No appointment types.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {editing && (
                <div className="mt-4 border rounded p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Name</span>
                            <input
                                className="border rounded p-2"
                                value={editing.name || ""}
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Duration (hh:mm:ss)</span>
                            <input
                                className="border rounded p-2"
                                value={editing.duration || ""}
                                onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Price</span>
                            <input
                                type="number"
                                className="border rounded p-2"
                                value={editing.price ?? 0}
                                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Assigned Resource</span>
                            <select
                                className="border rounded p-2"
                                value={editing.assignedResourceId ?? ""}
                                onChange={(e) =>
                                    setEditing({
                                        ...editing,
                                        assignedResourceId: e.target.value === "" ? undefined : Number(e.target.value),
                                    })
                                }
                            >
                                <option value="">(None)</option>
                                {resources.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="md:col-span-2 flex flex-col text-sm">
                            <span className="mb-1">Description</span>
                            <textarea
                                className="border rounded p-2"
                                value={editing.description || ""}
                                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={!!editing.isPublic}
                                onChange={(e) => setEditing({ ...editing, isPublic: e.target.checked })}
                            />
                            Public
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={!!editing.requiresWaiver}
                                onChange={(e) => setEditing({ ...editing, requiresWaiver: e.target.checked })}
                            />
                            Requires Waiver
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button className="bg-blue-600 text-white px-3 py-1.5 rounded" onClick={handleSave}>
                            Save
                        </button>
                        <button
                            className="bg-gray-200 px-3 py-1.5 rounded"
                            onClick={() => {
                                setEditing(null);
                                setEditingId(null);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
