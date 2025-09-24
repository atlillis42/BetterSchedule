import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthContext";
import ReservationParticipantsSection from "@/components/reservations/ReservationParticipantsSection";
import ClientSearchInput from "@/components/modals/ClientSearchInput";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { setReservationStatus } from "@/api/reservation-api";

type ProviderLite = { id: string; name: string };
type CalendarResource = { id: number; name: string };

type EventModalProps = {
    open: boolean;
    mode: "create" | "edit";
    type: "reservation" | "blockedTime";
    setType: (t: "reservation" | "blockedTime") => void;
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    onSubmit?: () => void;
    onDelete?: () => void;
    onCancel: () => void;
    error: string | null;
    resources: CalendarResource[];
    providers: ProviderLite[];
    /** Optional: ask parent to refresh calendar after quick-status action */
    onRefreshRequested?: () => void;
};

const EventModal: React.FC<EventModalProps> = ({
    open,
    mode,
    type,
    setType,
    values,
    setValues,
    onSubmit,
    onDelete,
    onCancel,
    error,
    resources,
    providers,
    onRefreshRequested,
}) => {
    const { isManager, isProvider } = useAuth();
    const canEditParticipants = isManager || isProvider;

    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);
    const reservationId = typeof values?.id === "number" ? values.id : undefined;

    // Optional reason appended to notes on quick-status actions
    const [statusReason, setStatusReason] = useState("");

    // IMPORTANT: hooks must be before any conditional return
    const busyRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        if (type !== "reservation") return;
        (async () => {
            try {
                const list = await getAppointmentTypes();
                if (!cancelled) setAppointmentTypes(list);
            } catch {
                /* no-op */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [type]);

    const providerOptions = useMemo(() => providers ?? [], [providers]);
    const resourceOptions = useMemo(() => resources ?? [], [resources]);

    const selectedAppointmentType: AppointmentTypeDto | undefined = useMemo(() => {
        const id = values?.appointmentTypeId != null ? Number(values.appointmentTypeId) : undefined;
        return id ? appointmentTypes.find((t) => t.id === id) : undefined;
    }, [values?.appointmentTypeId, appointmentTypes]);

    const handleField = (key: string, value: unknown) => {
        setValues((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSelectNumber = (key: string, value: string) => {
        handleField(key, value ? Number(value) : undefined);
    };

    const handleAppointmentTypeChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        const idString = e.target.value;
        const id = idString ? Number(idString) : undefined;
        setValues((prev: any) => {
            const next = { ...prev, appointmentTypeId: id };
            if (id && (prev.resourceId === "" || prev.resourceId === undefined || prev.resourceId === null)) {
                const typeMatch = appointmentTypes.find((t) => t.id === id);
                if (typeMatch?.assignedResourceId) next.resourceId = typeMatch.assignedResourceId;
            }
            return next;
        });
    };

    if (!open) return null;

    // Quick status actions
    const runQuickStatus = async (status: "Completed" | "Canceled" | "NoShow") => {
        if (!reservationId || busyRef.current) return;
        busyRef.current = true;
        try {
            await setReservationStatus(reservationId, status, {
                currentNotes: values?.notes ?? "",
                reason: statusReason.trim() || undefined,
                toastSuccess: false,
            });
            toast.success(`Status set to ${status}.`);
            onRefreshRequested?.();
            onCancel();
        } catch (err: any) {
            const msg =
                (err?.response?.data?.message as string | undefined) ||
                (err instanceof Error ? err.message : undefined) ||
                "";

            const needsManagerOverride =
                !!msg &&
                (msg.toLowerCase().includes("manager approval") ||
                    msg.toLowerCase().includes("manager override") ||
                    msg.toLowerCase().includes("within"));

            if (isManager && needsManagerOverride) {
                const ok = window.confirm("This action may require a manager override. Proceed?");
                if (ok) {
                    try {
                        await setReservationStatus(reservationId, status, {
                            currentNotes: values?.notes ?? "",
                            reason: statusReason.trim() || undefined,
                            managerOverride: true,
                            toastSuccess: false,
                        });
                        toast.success(`Status set to ${status}.`);
                        onRefreshRequested?.();
                        onCancel();
                    } catch (err2: any) {
                        const m2 =
                            (err2?.response?.data?.message as string | undefined) ||
                            (err2 instanceof Error ? err2.message : undefined) ||
                            "Failed to update status.";
                        toast.error(m2);
                    }
                }
            } else {
                toast.error(msg || "Failed to update status.");
            }
        } finally {
            busyRef.current = false;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            className={`px-3 py-1 rounded-lg border text-sm ${type === "reservation" ? "bg-gray-100" : ""}`}
                            onClick={() => setType("reservation")}
                        >
                            Reservation
                        </button>
                        <button
                            className={`px-3 py-1 rounded-lg border text-sm ${type === "blockedTime" ? "bg-gray-100" : ""}`}
                            onClick={() => setType("blockedTime")}
                        >
                            Blocked Time
                        </button>
                    </div>
                    <div className="text-sm text-gray-500">{mode === "edit" ? "Edit" : "Create"}</div>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    {type === "reservation" ? (
                        <div className="flex flex-col gap-4">
                            {/* Quick Status Actions (Edit mode only) */}
                            {mode === "edit" && reservationId && (
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
                                        <div className="font-medium text-sm">Quick status:</div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={() => runQuickStatus("Completed")}
                                            >
                                                Mark Completed
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-rose-600 text-white hover:bg-rose-700"
                                                onClick={() => runQuickStatus("Canceled")}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-amber-500 text-white hover:bg-amber-600"
                                                onClick={() => runQuickStatus("NoShow")}
                                            >
                                                No-Show
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <label className="text-xs text-gray-600">Reason (optional)</label>
                                        <input
                                            className="flex-1 border rounded px-2 py-1 text-sm"
                                            placeholder="e.g., client requested, illness, no answer…"
                                            value={statusReason}
                                            onChange={(e) => setStatusReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Main reservation form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Client</label>
                                    <ClientSearchInput
                                        valueId={typeof values.clientId === "string" ? values.clientId : null}
                                        initialLabel={values.clientName ?? null}
                                        onChange={(c) => handleField("clientId", c?.id ?? "")}
                                        placeholder="Search clients…"
                                        disabled={false}
                                        autoFocus={mode === "create"}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Service Provider</label>
                                    <select
                                        className="border rounded-lg px-3 py-2"
                                        value={values.serviceProviderId || ""}
                                        onChange={(e) => handleField("serviceProviderId", e.target.value)}
                                    >
                                        <option value="">Select provider</option>
                                        {providerOptions.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name || p.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Appointment Type</label>
                                    <select
                                        className="border rounded-lg px-3 py-2"
                                        value={values.appointmentTypeId != null ? String(values.appointmentTypeId) : ""}
                                        onChange={handleAppointmentTypeChange}
                                    >
                                        <option value="">Select type</option>
                                        {appointmentTypes.map((t) => (
                                            <option key={t.id} value={String(t.id)}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedAppointmentType && (
                                        <div className="mt-1 text-xs text-gray-600">
                                            Duration: {selectedAppointmentType.duration}
                                            {typeof selectedAppointmentType.price === "number" ? ` • $${selectedAppointmentType.price}` : ""}
                                            {selectedAppointmentType.assignedResourceName
                                                ? ` • Default resource: ${selectedAppointmentType.assignedResourceName}`
                                                : ""}
                                            {selectedAppointmentType.requiresWaiver ? " • Requires waiver" : ""}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Resource (optional)</label>
                                    <select
                                        className="border rounded-lg px-3 py-2"
                                        value={values.resourceId != null ? String(values.resourceId) : ""}
                                        onChange={(e) => handleSelectNumber("resourceId", e.target.value)}
                                    >
                                        <option value="">None</option>
                                        {resourceOptions.map((r) => (
                                            <option key={r.id} value={String(r.id)}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Start</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.startDate || ""}
                                            onChange={(e) => handleField("startDate", e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.startTime || ""}
                                            onChange={(e) => handleField("startTime", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">End</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.endDate || ""}
                                            onChange={(e) => handleField("endDate", e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.endTime || ""}
                                            onChange={(e) => handleField("endTime", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1">
                                    <label className="text-sm font-medium">Notes</label>
                                    <textarea
                                        className="border rounded-lg px-3 py-2 min-h-[72px]"
                                        value={values.notes || ""}
                                        onChange={(e) => handleField("notes", e.target.value)}
                                        placeholder="optional notes"
                                    />
                                </div>
                            </div>

                            {mode === "edit" && reservationId && (
                                <ReservationParticipantsSection
                                    reservationId={reservationId}
                                    primaryClientId={values.clientId ?? ""}
                                    primaryProviderId={values.serviceProviderId ?? ""}
                                    canEdit={canEditParticipants}
                                />
                            )}
                        </div>
                    ) : (
                        // Blocked Time form
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Resource (optional)</label>
                                <select
                                    className="border rounded-lg px-3 py-2"
                                    value={values.resourceId != null ? String(values.resourceId) : ""}
                                    onChange={(e) => handleSelectNumber("resourceId", e.target.value)}
                                >
                                    <option value="">None</option>
                                    {resourceOptions.map((r) => (
                                        <option key={r.id} value={String(r.id)}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Reason</label>
                                <input
                                    className="border rounded-lg px-3 py-2"
                                    value={values.reason || ""}
                                    onChange={(e) => handleField("reason", e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Start</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.startDate || ""}
                                        onChange={(e) => handleField("startDate", e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.startTime || ""}
                                        onChange={(e) => handleField("startTime", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">End</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.endDate || ""}
                                        onChange={(e) => handleField("endDate", e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.endTime || ""}
                                        onChange={(e) => handleField("endTime", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <div className="text-xs text-gray-500">{type === "reservation" ? "Reservation" : "Blocked time"}</div>
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button className="px-3 py-2 rounded-lg border text-red-700" onClick={onDelete}>
                                Delete
                            </button>
                        )}
                        <button className="px-3 py-2 rounded-lg border" onClick={onCancel}>
                            Cancel
                        </button>
                        {onSubmit && (
                            <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={onSubmit}>
                                Save
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventModal;
