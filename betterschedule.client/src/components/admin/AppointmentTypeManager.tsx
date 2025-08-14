import { useEffect, useState } from "react";
import {
    getAppointmentTypes,
    createAppointmentType,
    updateAppointmentType,
    deleteAppointmentType,
} from "@/api/appointmenttype-api";
import type { AppointmentTypeDto, CreateAppointmentTypeDto } from "@/api/appointmenttype-api";
import { toast } from "react-toastify";

const defaultForm: Partial<CreateAppointmentTypeDto> = {
    name: "",
    duration: "01:00:00",
    price: 0,
    description: "",
    createdByUserId: "", // Set to current user in real use
    isPublic: true,
    requiresWaiver: false,
};

export default function AppointmentTypeManager() {
    const [types, setTypes] = useState<AppointmentTypeDto[]>([]);
    const [editing, setEditing] = useState<Partial<CreateAppointmentTypeDto> | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const load = async () => {
        setTypes(await getAppointmentTypes());
    };

    useEffect(() => {
        load();
    }, []);

    const handleSave = async () => {
        if (!editing) return;
        try {
            if (editingId) {
                await updateAppointmentType(editingId, editing);
                toast.success("Updated!");
            } else {
                await createAppointmentType(editing as CreateAppointmentTypeDto);
                toast.success("Created!");
            }
            setEditing(null); setEditingId(null); load();
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
        <div>
            <h2 className="text-lg font-bold mb-2">Appointment Types</h2>
            <button
                className="bg-blue-500 text-white px-3 py-1 rounded mb-2"
                onClick={() => { setEditing({ ...defaultForm }); setEditingId(null); }}
            >+ New Appointment Type</button>
            <table className="w-full border text-sm">
                <thead>
                    <tr>
                        <th>Name</th><th>Duration</th><th>Price</th><th>Description</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {types.map(t => (
                        <tr key={t.id}>
                            <td>{t.name}</td>
                            <td>{t.duration}</td>
                            <td>${t.price}</td>
                            <td>{t.description}</td>
                            <td>
                                <button onClick={() => { setEditing(t); setEditingId(t.id); }}>Edit</button>
                                <button onClick={() => handleDelete(t.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {editing && (
                <div className="mt-4 border rounded p-4">
                    <input
                        className="mb-2 w-full border rounded p-2"
                        placeholder="Name"
                        value={editing.name || ""}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                    />
                    <input
                        className="mb-2 w-full border rounded p-2"
                        placeholder="Duration (hh:mm:ss)"
                        value={editing.duration || ""}
                        onChange={e => setEditing({ ...editing, duration: e.target.value })}
                    />
                    <input
                        className="mb-2 w-full border rounded p-2"
                        placeholder="Price"
                        type="number"
                        value={editing.price || ""}
                        onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}
                    />
                    <textarea
                        className="mb-2 w-full border rounded p-2"
                        placeholder="Description"
                        value={editing.description || ""}
                        onChange={e => setEditing({ ...editing, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleSave}>
                            Save
                        </button>
                        <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => { setEditing(null); setEditingId(null); }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
