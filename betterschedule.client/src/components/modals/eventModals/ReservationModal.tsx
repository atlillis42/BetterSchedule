import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthContext";
import ClientSearchInput from "@/components/modals/lookup/ClientSearchInput";
import ProviderSearchInput from "@/components/modals/lookup/ProviderSearchInput";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { setReservationStatus } from "@/api/reservation-api";
import { getClientNameCached } from "@/services/clientNameCache";
import { getProviderLiteById } from "@/api/user-api";
import { colorForReservationStatus } from "@/domain/calendar/eventStyle";

type ProviderLite = { id: string; name: string };
type CalendarResource = { id: number; name: string };
type NumberOption = { value: number; label: string };

type Props = {
    mode: "create" | "edit";
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    resources: CalendarResource[];
    providers: ProviderLite[];
    onRefreshRequested?: () => void;
    onCancel: () => void;
};

/** Prefer explicit reservationId; fall back to nested or parsed id */
function reservationIdFromValues(values: any): number | undefined {
    if (typeof values?.reservationId === "number") return values.reservationId;
    if (typeof values?.reservation?.id === "number") return values.reservation.id;

    const raw = values?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
        const m = raw.match(/(\d+)$/);
        if (m) return Number(m[1]);
    }
    return undefined;
}

const ReservationModal: React.FC<Props> = ({
    mode,
    values,
    setValues,
    resources,
    providers,
    onRefreshRequested,
    onCancel,
}) => {
    const { isManager } = useAuth();
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);
    const [statusReason, setStatusReason] = useState("");
    const busyRef = useRef(false);

    // Name maps for snappy labels
    const [clientNameMap, setClientNameMap] = useState<Map<string, string>>(new Map());
    const [providerNameMap, setProviderNameMap] = useState<Map<string, string>>(new Map());

    // Prime provider names from prop list
    useEffect(() => {
        if (!providers?.length) return;
        setProviderNameMap((prev) => {
            const next = new Map(prev);
            providers.forEach((p) => next.set(p.id, p.name || p.id));
            return next;
        });
    }, [providers]);

    // Resolve current client/provider names for visible labels
    const primaryClientId: string | undefined =
        typeof values?.clientId === "string" && values.clientId ? values.clientId : undefined;
    const primaryProviderId: string | undefined =
        typeof values?.serviceProviderId === "string" && values.serviceProviderId ? values.serviceProviderId : undefined;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (primaryClientId) {
                    const name = await getClientNameCached(primaryClientId);
                    if (!cancelled) setClientNameMap((m) => new Map(m).set(primaryClientId, name));
                }
            } catch { }
            try {
                if (primaryProviderId) {
                    const dto = await getProviderLiteById(primaryProviderId);
                    if (!cancelled)
                        setProviderNameMap((m) => new Map(m).set(primaryProviderId, dto?.name || primaryProviderId));
                }
            } catch { }
        })();
        return () => {
            cancelled = true;
        };
    }, [primaryClientId, primaryProviderId]);

    // react-select option data
    const resourceOptionsRS: NumberOption[] = useMemo(
        () => (resources ?? []).map((r) => ({ value: r.id, label: r.name })),
        [resources]
    );
    const selectedResourceOption: NumberOption | null = useMemo(() => {
        if (values?.resourceId == null) return null;
        const id = Number(values.resourceId);
        return resourceOptionsRS.find((o) => o.value === id) ?? null;
    }, [values?.resourceId, resourceOptionsRS]);

    const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentTypeDto | undefined>(undefined);
    const appointmentTypeOptionsRS: NumberOption[] = useMemo(
        () => appointmentTypes.map((t) => ({ value: t.id, label: t.name })),
        [appointmentTypes]
    );
    const selectedAppointmentTypeOption: NumberOption | null = useMemo(() => {
        if (values?.appointmentTypeId == null) return null;
        const id = Number(values.appointmentTypeId);
        return appointmentTypeOptionsRS.find((o) => o.value === id) ?? null;
    }, [values?.appointmentTypeId, appointmentTypeOptionsRS]);

    // Load appointment types
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await getAppointmentTypes();
                if (!cancelled) setAppointmentTypes(list);
            } catch { }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Keep selected appointmentType detail
    useEffect(() => {
        const id = values?.appointmentTypeId != null ? Number(values.appointmentTypeId) : undefined;
        setSelectedAppointmentType(id ? appointmentTypes.find((t) => t.id === id) : undefined);
    }, [values?.appointmentTypeId, appointmentTypes]);

    // Field helpers
    const handleField = (key: string, value: unknown) => {
        setValues((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleAppointmentTypeChange = (option: SingleValue<NumberOption>) => {
        const id = option?.value;
        setValues((prev: any) => {
            const next: any = { ...prev, appointmentTypeId: id };
            const match = id ? appointmentTypes.find((t) => t.id === id) : undefined;
            if (match?.assignedResourceId) next.resourceId = match.assignedResourceId;
            return next;
        });
    };

    // ------- Quick Status (edit only) -------
    const reservationId = reservationIdFromValues(values);

    const runQuickStatus = async (status: "Completed" | "Canceled" | "NoShow") => {
        if (!reservationId || busyRef.current) return;
        busyRef.current = true;
        try {
            await setReservationStatus(reservationId, status, {
                currentNotes: values?.notes ?? "",
                reason: statusReason.trim() || undefined,
                toastSuccess: false,
            });
            toast.success(
                status === "Completed"
                    ? "Marked as completed."
                    : status === "Canceled"
                        ? "Reservation canceled."
                        : "Marked as no-show."
            );
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
                const ok = window.confirm("This may require a manager override. Continue?");
                if (ok) {
                    try {
                        await setReservationStatus(reservationId, status, {
                            currentNotes: values?.notes ?? "",
                            reason: statusReason.trim() || undefined,
                            managerOverride: true,
                            toastSuccess: false,
                        });
                        toast.success(
                            status === "Completed"
                                ? "Marked as completed."
                                : status === "Canceled"
                                    ? "Reservation canceled."
                                    : "Marked as no-show."
                        );
                        onRefreshRequested?.();
                        onCancel();
                    } catch (err2: any) {
                        const m2 =
                            (err2?.response?.data?.message as string | undefined) ||
                            (err2 instanceof Error ? err2.message : undefined) ||
                            "We couldn't update the status.";
                        toast.error(m2);
                    }
                }
            } else {
                toast.error(msg || "We couldn't update the status.");
            }
        } finally {
            busyRef.current = false;
        }
    };

    const currentStatus: string | undefined =
        values?.status ?? values?.reservation?.status ?? values?.reservationStatus;

    return (
        <div className="flex flex-col gap-4">
            {/* Quick status (edit only) */}
            {mode === "edit" && reservationId && (
                <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="font-medium text-sm">Quick status:</div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded border bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                                    onClick={() => runQuickStatus("Completed")}
                                    disabled={busyRef.current}
                                >
                                    Mark Completed
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded border bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                                    onClick={() => runQuickStatus("Canceled")}
                                    disabled={busyRef.current}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded border bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                                    onClick={() => runQuickStatus("NoShow")}
                                    disabled={busyRef.current}
                                >
                                    No-Show
                                </button>
                            </div>
                        </div>

                        {/* Compact current status pill (visual confirmation) */}
                        {currentStatus && (
                            <div className="flex items-center gap-2 text-xs" title={`Reservation • ${currentStatus}`}>
                                <span
                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: colorForReservationStatus(currentStatus as any) }}
                                />
                                <span className="text-gray-700">{currentStatus}</span>
                            </div>
                        )}
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
                        initialLabel={values.clientName ?? clientNameMap.get(values.clientId ?? "") ?? null}
                        onChange={(c) => setValues((prev: any) => ({ ...prev, clientId: c?.id ?? "" }))}
                        placeholder="Search clients…"
                        disabled={false}
                        autoFocus={mode === "create"}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Service Provider</label>
                    <ProviderSearchInput
                        valueId={typeof values.serviceProviderId === "string" ? values.serviceProviderId : null}
                        initialLabel={providerNameMap.get(values.serviceProviderId ?? "") ?? null}
                        onChange={(p) => setValues((prev: any) => ({ ...prev, serviceProviderId: p?.id ?? "" }))}
                        placeholder="Search providers…"
                        disabled={false}
                        autoFocus={false}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Appointment Type</label>
                    <Select
                        className="text-sm"
                        classNamePrefix="rs"
                        options={appointmentTypeOptionsRS}
                        value={selectedAppointmentTypeOption}
                        onChange={handleAppointmentTypeChange}
                        isClearable
                        placeholder="Select type…"
                        noOptionsMessage={() => "No appointment types"}
                    />
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
                    <Select
                        className="text-sm"
                        classNamePrefix="rs"
                        options={resourceOptionsRS}
                        value={selectedResourceOption}
                        onChange={(option: SingleValue<NumberOption>) =>
                            setValues((prev: any) => ({ ...prev, resourceId: option?.value ?? undefined }))
                        }
                        isClearable
                        placeholder="None"
                        noOptionsMessage={() => "No resources"}
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
        </div>
    );
};

export default ReservationModal;
