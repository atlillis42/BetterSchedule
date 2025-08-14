import { useEffect, useState } from "react";
import { useAuth } from "@auth/AuthContext";
import { isManager } from "@auth/roles";
import {
    getResources,
    createResource,
    updateResource,
    deleteResource,
    type CalendarResourceDto,
    type CreateCalendarResourceDto,
    type UpdateCalendarResourceDto
} from "@/api/calendar-resource-api";
import { toast } from "react-toastify";

export default function ResourcesManager() {
    const { roles } = useAuth();
    const canAccess = isManager(roles); // manager-only for now

    const [resources, setResources] = useState<CalendarResourceDto[]>([]);
    const [editing, setEditing] = useState<Partial<CreateCalendarResourceDto & UpdateCalendarResourceDto> | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const load = async () => setResources(await getResources());
    useEffect(() => { load(); }, []);

    if (!canAccess) return <div className="p-4 text-sm text-gray-600">You do not have access to manage resources.</div>;

    const startCreate = () => { setEditing({ name: "", backColor: "" }); setEditingId(null); };
    const startEdit = (r: CalendarResourceDto) => { setEditing({ name: r.name, backColor: r.backColor ?? "" }); setEditingId(r.id); };

    const handleSave = async () => {
        if (!editing) return;
        try {
            if (editingId) {
                await updateResource(editingId, editing as UpdateCalendarResourceDto);
                toast.success("Resource updated.");
            } else {
                await createResource(editing as CreateCalendarResourceDto);
                toast.success("Resource created.");
            }
            setEditing(null); setEditingId(null); load();
        } catch {
            toast.error("Failed to save resource.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this resource?")) return;
        await deleteResource(id);
        load();
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Calendar Resources</h2>
                <button className="bg-blue-600 text-white px-3 py-1.5 rounded" onClick={startCreate}>+ New Resource</button>
            </div>

            <table className="w-full border text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Color</th>
                        <th className="p-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {resources.map(r => (
                        <tr key={r.id} className="border-t">
                            <td className="p-2">{r.name}</td>
                            <td className="p-2">
                                {r.backColor ? (
                                    <span className="inline-flex items-center gap-2">
                                        <span className="inline-block w-4 h-4 rounded" style={{ background: r.backColor }} />
                                        {r.backColor}
                                    </span>
                                ) : "(none)"}
                            </td>
                            <td className="p-2 text-right">
                                <button className="px-2 py-1 border rounded mr-2" onClick={() => startEdit(r)}>Edit</button>
                                <button className="px-2 py-1 border rounded" onClick={() => handleDelete(r.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {!resources.length && (
                        <tr><td colSpan={3} className="p-4 text-center text-gray-500">No resources yet.</td></tr>
                    )}
                </tbody>
            </table>

            {editing && (
                <div className="mt-4 border rounded p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Name</span>
                            <input className="border rounded p-2" value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span className="mb-1">Color (hex or CSS)</span>
                            <input className="border rounded p-2" placeholder="#73cfff" value={editing.backColor || ""} onChange={e => setEditing({ ...editing, backColor: e.target.value })} />
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <button className="bg-blue-600 text-white px-3 py-1.5 rounded" onClick={handleSave}>Save</button>
                        <button className="bg-gray-200 px-3 py-1.5 rounded" onClick={() => { setEditing(null); setEditingId(null); }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
