import React, { useCallback, useRef } from "react";
import AsyncSelect from "react-select/async";
import { searchClients } from "@/api/client-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

type ProviderLite = { id: string; name: string };

function TypeToggle({
    type,
    setType,
    disabled,
}: {
    type: "reservation" | "blockedTime";
    setType: (t: "reservation" | "blockedTime") => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex justify-center mb-4">
            <button
                className={`px-4 py-2 rounded-l ${type === "reservation" ? "bg-green-500 text-white" : "bg-gray-200"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={() => !disabled && setType("reservation")}
                style={{ borderRight: "1px solid #d1d5db" }}
                type="button"
                disabled={disabled}
                aria-pressed={type === "reservation"}
            >
                Reservation
            </button>
            <button
                className={`px-4 py-2 rounded-r ${type === "blockedTime" ? "bg-green-500 text-white" : "bg-gray-200"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={() => !disabled && setType("blockedTime")}
                type="button"
                disabled={disabled}
                aria-pressed={type === "blockedTime"}
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
    providers,
}: {
    open: boolean;
    mode: "create" | "edit";
    type: "reservation" | "blockedTime";
    setType: (t: "reservation" | "blockedTime") => void;
    values: any;
    setValues: React.Dispatch<any>;
    onSubmit?: () => void;
    onDelete?: () => void;
    onCancel: () => void;
    error?: string | null;
    resources: CalendarResource[];
    providers: ProviderLite[]; // proper provider list
}) {
    const readOnly = !onSubmit;

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<number | undefined>(undefined);

    const loadClientOptions = useCallback(
        (inputValue: string, callback: (opts: Array<{ value: string; label: string }>) => void) => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(async () => {
                abortRef.current?.abort();
                const controller = new AbortController();
                abortRef.current = controller;

                try {
                    const data = await searchClients(inputValue ?? "", { signal: controller.signal });
                    callback(data.map((c) => ({ value: c.id, label: c.name })));
                } catch {
                    callback([]);
                }
            }, 250);
        },
        []
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-xl p-6 w-full max-w-md">
                <TypeToggle type={type} setType={setType} disabled={mode === "edit"} />

                {type === "reservation" ? (
                    <>
                        {/* --- Reservation Form --- */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Client</label>
                            <AsyncSelect
                                cacheOptions
                                defaultOptions
                                loadOptions={loadClientOptions}
                                filterOption={() => true}
                                isClearable
                                isDisabled={readOnly}
                                value={values.clientId ? { value: values.clientId, label: values.clientName || "" } : null}
                                onChange={(option: any) =>
                                    setValues((v: any) => ({
                                        ...v,
                                        clientId: option ? option.value : "",
                                        clientName: option ? option.label : "",
                                    }))
                                }
                                placeholder="Search for a client…"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                            />
                            {values.clientId ? <p className="text-xs text-gray-500 mt-1">Selected: {values.clientName}</p> : null}
                        </div>

                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Event Name"
                            value={values.text || ""}
                            onChange={(e) => setValues((v: any) => ({ ...v, text: e.target.value }))}
                            disabled={readOnly}
                        />

                        {/* Appointment Type (numeric) */}
                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Appointment Type ID"
                            value={values.appointmentTypeId ?? ""}
                            type="number"
                            min={1}
                            onChange={(e) =>
                                setValues((v: any) => ({
                                    ...v,
                                    appointmentTypeId: e.target.value ? Number(e.target.value) : undefined,
                                }))
                            }
                            disabled={readOnly}
                        />

                        {/* Provider (string id) */}
                        <select
                            className="mb-2 w-full border rounded p-2"
                            value={values.serviceProviderId ?? ""}
                            onChange={(e) => setValues((v: any) => ({ ...v, serviceProviderId: e.target.value || undefined }))}
                            disabled={readOnly}
                        >
                            <option value="">Select Provider</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        {/* Resource (number id) */}
                        <select
                            className="mb-2 w-full border rounded p-2"
                            value={values.resourceId ?? ""}
                            onChange={(e) =>
                                setValues((v: any) => ({
                                    ...v,
                                    resourceId: e.target.value ? Number(e.target.value) : undefined,
                                }))
                            }
                            disabled={readOnly}
                        >
                            <option value="">Select Resource</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.startDate || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, startDate: e.target.value }))}
                                disabled={readOnly}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                step={60}
                                value={values.startTime || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, startTime: e.target.value }))}
                                disabled={readOnly}
                            />
                        </div>

                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.endDate || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, endDate: e.target.value }))}
                                disabled={readOnly}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                step={60}
                                value={values.endTime || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, endTime: e.target.value }))}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Participants</label>
                            {(!values.participants || values.participants.length === 0) ? (
                                <div className="text-sm text-gray-500">None</div>
                            ) : (
                                <ul className="list-disc list-inside text-sm">
                                    {values.participants.map((p: any) => (
                                        <li key={p.id}>{p.role}: {p.userId || p.guestName}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <textarea
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Notes"
                            value={values.notes || ""}
                            onChange={(e) => setValues((v: any) => ({ ...v, notes: e.target.value }))}
                            disabled={readOnly}
                        />
                    </>
                ) : (
                    <>
                        {/* --- Blocked Time Form --- */}
                        <input
                            className="mb-2 w-full border rounded p-2"
                            placeholder="Reason"
                            value={values.reason || ""}
                            onChange={(e) => setValues((v: any) => ({ ...v, reason: e.target.value }))}
                            disabled={readOnly}
                        />

                        <select
                            className="mb-2 w-full border rounded p-2"
                            value={values.resourceId ?? ""}
                            onChange={(e) =>
                                setValues((v: any) => ({
                                    ...v,
                                    resourceId: e.target.value ? Number(e.target.value) : undefined,
                                }))
                            }
                            disabled={readOnly}
                        >
                            <option value="">Select Resource</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.startDate || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, startDate: e.target.value }))}
                                disabled={readOnly}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                step={60}
                                value={values.startTime || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, startTime: e.target.value }))}
                                disabled={readOnly}
                            />
                        </div>

                        <div className="flex gap-2 mb-2">
                            <input
                                className="w-1/2 border rounded p-2"
                                type="date"
                                value={values.endDate || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, endDate: e.target.value }))}
                                disabled={readOnly}
                            />
                            <input
                                className="w-1/2 border rounded p-2"
                                type="time"
                                step={60}
                                value={values.endTime || ""}
                                onChange={(e) => setValues((v: any) => ({ ...v, endTime: e.target.value }))}
                                disabled={readOnly}
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    {mode === "edit" && onDelete && (
                        <button className="px-4 py-2 rounded bg-red-500 text-white" onClick={onDelete} type="button">
                            Delete
                        </button>
                    )}
                    <button className="px-4 py-2 rounded bg-gray-200" onClick={onCancel} type="button">
                        Cancel
                    </button>
                    {onSubmit && (
                        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSubmit} type="button">
                            {mode === "edit" ? "Save" : "Create"}
                        </button>
                    )}
                </div>

                {error && <div className="text-red-600 mt-2">{error}</div>}
            </div>
        </div>
    );
}

export default EventModal;
