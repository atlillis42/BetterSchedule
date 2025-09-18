import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthContext";
import ReservationParticipantsSection from "@/components/reservations/ReservationParticipantsSection";
import ClientSearchInput from "@/components/modals/ClientSearchInput";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { setReservationStatus } from "@/api/reservation-api";

type ProviderLite = { id: string; name: string };
type CalendarResource = { id: number; name: string };

export default function ReservationForm(props: {
    mode: "create" | "edit";
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    providers: ProviderLite[];
    resources: CalendarResource[];
    onRefreshRequested?: () => void;
    onClose: () => void;
}) {
    const { mode, values, setValues, providers, resources, onRefreshRequested, onClose } = props;
    const { isManager, isProvider } = useAuth();
    const canEditParticipants = isManager || isProvider;

    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);
    const reservationId = typeof values?.id === "number" ? values.id : undefined;

    // Quick status reason
    const [statusReason, setStatusReason] = useState("");
    const busyRef = useRef(false);

    // Load appointment types once when this form is active
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await getAppointmentTypes();
                if (!cancelled) setAppointmentTypes(list);
            } catch {
                /* no-op */
            }
        })();
        return () => { cancelled = true; };
    }, []);

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

    // Prefill resource from AppointmentType.assignedResourceId if none selected yet
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

    // Minimal "selected" object for the client picker when clientId is present
    const selectedClient =
        values.clientId && typeof values.clientId === "string"
            ? { id: values.clientId, name: values.clientId }
            : null;

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
            onClose();
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
                        onClose();
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
        <div className="flex flex-col gap-4">
            {/* Quick Status (edit only) */}
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
                        selected={selectedClient}
                        onSelect={(c) => setValues((prev: any) => ({ ...prev, clientId: c.id }))}
                        onClear={() => setValues((prev: any) => ({ ...prev, clientId: "" }))}
                        placeholder="Search clients…"
                        disabled={false}
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
                            <option key={p.id} value={p.id}>{p.name || p.id}</option>
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
                            <option key={t.id} value={String(t.id)}>{t.name}</option>
                        ))}
                    </select>
                    {selectedAppointmentType && (
                        <div className="mt-1 text-xs text-gray-600">
                            Duration: {selectedAppointmentType.duration}
                            {typeof selectedAppointmentType.price === "number" ? ` • $${selectedAppointmentType.price}` : ""}
                            {selectedAppointmentType.assignedResourceName ? ` • Default resource: ${selectedAppointmentType.assignedResourceName}` : ""}
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
                            <option key={r.id} value={String(r.id)}>{r.name}</option>
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
    );
}
