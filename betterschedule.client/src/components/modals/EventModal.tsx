import React from "react";
import AsyncSelect from "react-select/async";
import { searchClients } from "@/api/client-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

// Segmented toggle at the top
function TypeToggle({ type, setType }: { type: string, setType: (t: string) => void }) {
    return (
        <div className="flex justify-center mb-4">
            <button
                className={`px-4 py-2 rounded-l ${type === "reservation" ? "bg-green-500 text-white" : "bg-gray-200"}`}
                onClick={() => setType("reservation")}
                style={{ borderRight: "1px solid #d1d5db" }}
                type="button"
            >
                Reservation
            </button>
            <button
                className={`px-4 py-2 rounded-r ${type === "blockedTime" ? "bg-green-500 text-white" : "bg-gray-200"}`}
                onClick={() => setType("blockedTime")}
                type="button"
            >
                Blocked Time
            </button>
        </div>
    );
}

export function EventModal({
    open,
    mode, // "create" | "edit"
    type, // "reservation" | "blockedTime"
    setType,
    values,
    setValues,
    onSubmit,
    onDelete,
    onCancel,
    error,
    resources,
}: {
    open: boolean;
    mode: "create" | "edit";
    type: "reservation" | "blockedTime";
    setType: (t: "reservation" | "blockedTime") => void;
    values: any;
    setValues: React.Dispatch<any>;
    onSubmit: () => void;
    onDelete?: () => void;
    onCancel: () => void;
    error?: string | null;
    resources: CalendarResource[];
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-xl p-6 w-full max-w-md">
                <TypeToggle type={type} setType={setType} />
                {type === "reservation" ? (
                    <>
                        {/* --- Reservation Form --- */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium">Client</label>
                            <AsyncSelect
                                cacheOptions
                                defaultOptions
                                loadOptions={async (inputValue) => {
                                    const results = await searchClients(inputValue);
                                    return results.map(c => ({
                                        value: c.id,
                                        label: c.name,
                                    }));
                                }}
                                value={
                                    values.clientId
                                        ? { value: values.clientId, label: values.clientName || "" }
                                        : null
                                }
                                onChange={option =>
                                    setValues((v: any) => ({
                                        ...v,
                                        clientId: option ? option.value : "",
                                        clientName: option ? option.label : ""
                                    }))
                                }
                                placeholder="Search for a client..."
                                isClearable
                            />
                        </div>
                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Event Name"
                            value={values.text || ""}
                            onChange={e => setValues((v: any) => ({ ...v, text: e.target.value }))}
                        />
                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Appointment Type ID"
                            value={values.appointmentTypeId || ""}
                            type="number"
                            min={1}
                            onChange={e => setValues((v: any) => ({ ...v, appointmentTypeId: e.target.value }))}
                        />
                        <select
                            className="mb-2 w-full border rounded p-2"
                            value={values.serviceProviderId || ""}
                            onChange={e => setValues((v: any) => ({ ...v, serviceProviderId: e.target.value }))}
                        >
                            <option value="">Select Provider</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.startDate || ""}
                                onChange={e => setValues((v: any) => ({ ...v, startDate: e.target.value }))}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                value={values.startTime || ""}
                                onChange={e => setValues((v: any) => ({ ...v, startTime: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.endDate || ""}
                                onChange={e => setValues((v: any) => ({ ...v, endDate: e.target.value }))}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                value={values.endTime || ""}
                                onChange={e => setValues((v: any) => ({ ...v, endTime: e.target.value }))}
                            />
                        </div>
                        <textarea
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Notes"
                            value={values.notes || ""}
                            onChange={e => setValues((v: any) => ({ ...v, notes: e.target.value }))}
                        />
                    </>
                ) : (
                    <>
                        {/* --- Blocked Time Form --- */}
                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Reason"
                            value={values.reason || ""}
                            onChange={e => setValues((v: any) => ({ ...v, reason: e.target.value }))}
                        />
                        <select
                            className="mb-2 w-full border rounded p-2"
                            value={values.resourceId || ""}
                            onChange={e => setValues((v: any) => ({ ...v, resourceId: e.target.value }))}
                        >
                            <option value="">Select Resource</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.startDate || ""}
                                onChange={e => setValues((v: any) => ({ ...v, startDate: e.target.value }))}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                value={values.startTime || ""}
                                onChange={e => setValues((v: any) => ({ ...v, startTime: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.endDate || ""}
                                onChange={e => setValues((v: any) => ({ ...v, endDate: e.target.value }))}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                value={values.endTime || ""}
                                onChange={e => setValues((v: any) => ({ ...v, endTime: e.target.value }))}
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    {mode === "edit" && (
                        <button
                            className="px-4 py-2 rounded bg-red-500 text-white"
                            onClick={onDelete}
                            type="button"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        className="px-4 py-2 rounded bg-gray-200"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-blue-600 text-white"
                        onClick={onSubmit}
                        type="button"
                    >
                        {mode === "edit" ? "Save" : "Create"}
                    </button>
                </div>
                {error && <div className="text-red-600 mt-2">{error}</div>}
            </div>
        </div>
    );
}

export default EventModal;
