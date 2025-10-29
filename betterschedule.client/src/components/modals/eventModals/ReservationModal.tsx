import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/auth-context";
import ClientSearchInput from "@/components/modals/lookup/ClientSearchInput";
import ProviderSearchInput from "@/components/modals/lookup/ProviderSearchInput";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { setReservationStatus, cancelReservationAsClient, updateReservation } from "@/api/reservation-api";
import { getClientNameCached } from "@/services/clientNameCache";
import { getProviderLiteById } from "@/api/user-api";
import { colorForReservationStatus } from "@/domain/calendar/eventStyle";
import { buildReactSelectStyles } from "@/styles/reactSelectStyles";

type ProviderLite = { id: string; name: string };
type CalendarResource = { id: number; name: string };

/** Single-value option used by the Number-based selects. */
type NumberOption = { value: number; label: string };

type Props = {
    /** "create" to build a new reservation; "edit" to modify an existing one. */
    mode: "create" | "edit";
    /** Form state bag; contains reservation fields and UI helpers. */
    values: any;
    /** Updater for the form state. */
    setValues: (updater: (prev: any) => any) => void;
    /** Optional list of reservable resources. */
    resources: CalendarResource[];
    /** List of selectable service providers. */
    providers: ProviderLite[];
    /** Ask parent to reload calendar data after a successful action. */
    onRefreshRequested?: () => void;
    /** Close the modal. */
    onCancel: () => void;
};

/** Defensive extraction for reservation id from various shapes. */
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

function fmtDate(value?: string) { return value || ""; }
function fmtTime(value?: string) { return value || ""; }
function labelForStatus(s?: string) { return s === "NoShow" ? "No-Show / Late Cancel" : s || ""; }


const ReservationModal: React.FC<Props> = ({
    mode,
    values,
    setValues,
    resources,
    providers,
    onRefreshRequested,
    onCancel,
}) => {
    const { isManager, isProvider, userId } = useAuth();
    const isClientOnly = !isManager && !isProvider;

    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);
    const [statusReason, setStatusReason] = useState("");
    const busyRef = useRef(false);

    const [clientNameMap, setClientNameMap] = useState<Map<string, string>>(new Map());
    const [providerNameMap, setProviderNameMap] = useState<Map<string, string>>(new Map());

    const menuPortalTarget =
        typeof document !== "undefined"
            ? (document.querySelector(".bs-modal") as HTMLElement) ?? document.body
            : undefined;

    useEffect(() => {
        if (!providers?.length) return;
        setProviderNameMap((prev) => {
            const next = new Map(prev);
            providers.forEach((p) => next.set(p.id, p.name || p.id));
            return next;
        });
    }, [providers]);

    const primaryClientId: string | undefined =
        (typeof values?.clientId === "string" && values.clientId) ||
        (typeof values?.reservation?.clientId === "string" && values.reservation.clientId) ||
        undefined;

    const primaryProviderId: string | undefined =
        (typeof values?.serviceProviderId === "string" && values.serviceProviderId) ||
        (typeof values?.reservation?.serviceProviderId === "string" && values.reservation.serviceProviderId) ||
        undefined;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (primaryClientId) {
                    const name = await getClientNameCached(primaryClientId);
                    if (!cancelled) setClientNameMap((m) => new Map(m).set(primaryClientId, name));
                }
            } catch { /* non-fatal */ }
            try {
                if (primaryProviderId) {
                    const dto = await getProviderLiteById(primaryProviderId);
                    if (!cancelled) setProviderNameMap((m) => new Map(m).set(primaryProviderId, dto?.name || primaryProviderId));
                }
            } catch { /* non-fatal */ }
        })();
        return () => { cancelled = true; };
    }, [primaryClientId, primaryProviderId]);

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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await getAppointmentTypes();
                if (!cancelled) setAppointmentTypes(list);
            } catch { /* non-fatal */ }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const id = values?.appointmentTypeId != null ? Number(values.appointmentTypeId) : undefined;
        setSelectedAppointmentType(id ? appointmentTypes.find((t) => t.id === id) : undefined);
    }, [values?.appointmentTypeId, appointmentTypes]);

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

    const reservationId = reservationIdFromValues(values);

    // Client is allowed to cancel only if they own the reservation
    const userOwnsReservation =
        !!isClientOnly && !!userId && !!primaryClientId && String(userId) === String(primaryClientId);

    // ---- Quick status (staff only) ------------------------------------------
    const runQuickStatus = async (status: "Booked" | "Completed" | "Canceled" | "NoShow") => {
        if (!reservationId || busyRef.current) return;
        busyRef.current = true;

        const currentNotes: string = values?.notes ?? "";
        const reason = (statusReason || "").trim();
        const notesForBooked = reason ? `${currentNotes}\n[status=${status}] ${reason}` : undefined;

        const doApply = async (opts?: { managerOverride?: boolean; providerOverride?: boolean }) => {
            if (status === "Booked") {
                await updateReservation(
                    reservationId,
                    { status, notes: notesForBooked },
                    { managerOverride: !!opts?.managerOverride, providerOverride: !!opts?.providerOverride, toastSuccess: false }
                );
            } else {
                await setReservationStatus(reservationId, status, {
                    currentNotes,
                    reason: reason || undefined,
                    managerOverride: !!opts?.managerOverride,
                    providerOverride: !!opts?.providerOverride,
                    toastSuccess: false,
                });
            }
        };

        try {
            await doApply();
            toast.success(
                status === "Booked"
                    ? "Marked as booked."
                    : status === "Completed"
                        ? "Marked as completed."
                        : status === "Canceled"
                            ? "Reservation canceled."
                            : "Marked as no-show / late cancel."
            );
            onRefreshRequested?.();
            onCancel();
        } catch (err: any) {
            const msg =
                (err?.response?.data?.message as string | undefined) ||
                (err instanceof Error ? err.message : undefined) ||
                "";

            const looksLikeWindow =
                !!msg && (/\bwithin\b/i.test(msg) || /hours of start/i.test(msg) || /change window/i.test(msg));

            const eventProviderId =
                (values?.serviceProviderId ? String(values.serviceProviderId) : undefined) ??
                (values?.originalServiceProviderId ? String(values.originalServiceProviderId) : undefined) ??
                (values?.reservation?.serviceProviderId ? String(values.reservation.serviceProviderId) : undefined);

            const isAssignedProvider = !!userId && !!eventProviderId && String(userId) === eventProviderId;

            if (looksLikeWindow) {
                if (isManager) {
                    const ok = window.confirm("This action is within the organization’s change window. Override and proceed?");
                    if (ok) {
                        try {
                            await doApply({ managerOverride: true });
                            toast.success(
                                status === "Booked"
                                    ? "Marked as booked."
                                    : status === "Completed"
                                        ? "Marked as completed."
                                        : status === "Canceled"
                                            ? "Reservation canceled."
                                            : "Marked as no-show / late cancel."
                            );
                            onRefreshRequested?.();
                            onCancel();
                            return;
                        } catch (err2: any) {
                            const m2 =
                                (err2?.response?.data?.message as string | undefined) ||
                                (err2 instanceof Error ? err2.message : undefined) ||
                                "We couldn't update the status.";
                            toast.error(m2);
                            busyRef.current = false;
                            return;
                        }
                    }
                } else if (isProvider && isAssignedProvider) {
                    const ok = window.confirm("This action is within the change window. Proceed as the assigned provider?");
                    if (ok) {
                        try {
                            await doApply({ providerOverride: true });
                            toast.success(
                                status === "Booked"
                                    ? "Marked as booked."
                                    : status === "Completed"
                                        ? "Marked as completed."
                                        : status === "Canceled"
                                            ? "Reservation canceled."
                                            : "Marked as no-show / late cancel."
                            );
                            onRefreshRequested?.();
                            onCancel();
                            return;
                        } catch (err2: any) {
                            const m2 =
                                (err2?.response?.data?.message as string | undefined) ||
                                (err2 instanceof Error ? err2.message : undefined) ||
                                "We couldn't update the status.";
                            toast.error(m2);
                            busyRef.current = false;
                            return;
                        }
                    }
                }
            }

            toast.error(msg || "We couldn't update the status.");
        } finally {
            busyRef.current = false;
        }
    };

    // ---- Client cancel action -----------------------------------------------
    const runClientCancel = async () => {
        if (!reservationId || busyRef.current) return;
        const proceed = window.confirm(
            "Cancel this appointment?\n\nIf this is within your organization’s late-cancel window, it will be marked as a late cancel and may incur a fee per policy."
        );
        if (!proceed) return;

        busyRef.current = true;
        try {
            await cancelReservationAsClient(reservationId);
            toast.success("Reservation canceled.");
            onRefreshRequested?.();
            onCancel();
        } catch (err: any) {
            const msg =
                (err?.response?.data?.message as string | undefined) ||
                (err instanceof Error ? err.message : undefined) ||
                "";
            toast.error(msg || "We couldn't cancel this reservation.");
        } finally {
            busyRef.current = false;
        }
    };

    const currentStatus: string | undefined =
        values?.status ?? values?.reservation?.status ?? values?.reservationStatus;

    const disableEdits = isClientOnly;

    // NEW: unified react-select styles using CSS vars
    const rsStyles = useMemo(() => buildReactSelectStyles<NumberOption>(), []);

    // --- Editable vs read-only client logic ----------------------------------
    const canEditClient = mode === "create" && !isClientOnly;
    const displayClientName =
        (typeof values?.clientName === "string" && values.clientName) ||
        (primaryClientId ? clientNameMap.get(primaryClientId) ?? null : null) ||
        (primaryClientId ?? "");

    return (
        <div className="flex flex-col gap-4">
            {/* Staff-only quick status row */}
            {mode === "edit" && reservationId && !isClientOnly && (
                <div className="rounded-lg border bg-slate-50 p-3 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="font-medium text-sm text-slate-800 dark:text-slate-100">Quick status:</div>
                            <div className="flex flex-wrap gap-2">
                                {/* Booked (blue) */}
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded-lg shadow-sm border border-transparent text-white bg-[#3b82f6] hover:bg-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 disabled:opacity-60"
                                    onClick={() => runQuickStatus("Booked")}
                                    disabled={busyRef.current}
                                >
                                    Booked
                                </button>

                                {/* Completed (emerald) */}
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded-lg shadow-sm border border-transparent text-white bg-[#10b981] hover:bg-[#059669] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 disabled:opacity-60"
                                    onClick={() => runQuickStatus("Completed")}
                                    disabled={busyRef.current}
                                >
                                    Completed
                                </button>

                                {/* Canceled (amber) */}
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded-lg shadow-sm border border-transparent text-white bg-[#f59e0b] hover:bg-[#d97706] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 disabled:opacity-60"
                                    onClick={() => runQuickStatus("Canceled")}
                                    disabled={busyRef.current}
                                >
                                    Canceled
                                </button>

                                {/* No-Show (red) */}
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-sm rounded-lg shadow-sm border border-transparent text-white bg-[#ef4444] hover:bg-[#dc2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 disabled:opacity-60"
                                    onClick={() => runQuickStatus("NoShow")}
                                    disabled={busyRef.current}
                                >
                                    No-Show/Late Cancel
                                </button>
                            </div>
                        </div>

                        {currentStatus && (
                            <div className="flex items-center gap-2 text-xs" title={`Reservation • ${labelForStatus(currentStatus)}`}>
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForReservationStatus(currentStatus as any) }} />
                                <span className="text-slate-700 dark:text-slate-300">{labelForStatus(currentStatus)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-slate-600 dark:text-slate-300">Reason (optional)</label>
                        <input
                            className="flex-1 border rounded px-2 py-1 text-sm border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            placeholder="e.g., client requested, illness, no answer…"
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            disabled={busyRef.current}
                        />
                    </div>
                </div>
            )}

            {/* Client-only banner */}
            {isClientOnly && mode === "edit" && (
                <div className="rounded-lg border bg-blue-50 p-3 text-xs text-blue-900 border-blue-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700">
                    You can cancel this appointment here. If it’s within your organization’s late-cancel window, it will be marked as a <strong>late cancel</strong> and may be subject to the organization’s policy.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Client field:
                    - CREATE: show searchable picker
                    - EDIT: show read-only value (no reassignment)
                */}
                {canEditClient ? (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Client</label>
                        <ClientSearchInput
                            valueId={typeof values.clientId === "string" ? values.clientId : null}
                            initialLabel={values.clientName ?? (values.clientId ? clientNameMap.get(values.clientId) ?? null : null)}
                            onChange={(c) => setValues((prev: any) => ({ ...prev, clientId: c?.id ?? "" }))}
                            placeholder="Search clients…"
                            disabled={disableEdits}
                            autoFocus={mode === "create" && !disableEdits}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Client</label>
                        <div
                            className="rounded-lg border px-3 py-2 text-sm text-slate-900 bg-slate-50 border-slate-200
                                       dark:text-slate-100 dark:bg-slate-800/60 dark:border-slate-700"
                            aria-readonly
                            title="Client is fixed for existing reservations"
                        >
                            {displayClientName || "—"}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Service Provider</label>
                    <ProviderSearchInput
                        valueId={typeof values.serviceProviderId === "string" ? values.serviceProviderId : null}
                        initialLabel={values.serviceProviderId ? providerNameMap.get(values.serviceProviderId) ?? null : null}
                        onChange={(p) => setValues((prev: any) => ({ ...prev, serviceProviderId: p?.id ?? "" }))}
                        placeholder={disableEdits ? "" : "Search providers…"}
                        disabled={disableEdits}
                        autoFocus={false}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Appointment Type</label>
                    <Select
                        className="text-sm rs-container"
                        classNamePrefix="rs"
                        options={appointmentTypeOptionsRS}
                        value={selectedAppointmentTypeOption}
                        onChange={handleAppointmentTypeChange}
                        isClearable={!disableEdits}
                        placeholder={disableEdits ? "" : "Select type…"}
                        noOptionsMessage={() => "No appointment types"}
                        isDisabled={disableEdits}
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        styles={rsStyles}
                    />
                    {selectedAppointmentType && (
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            Duration: {selectedAppointmentType.duration}
                            {typeof selectedAppointmentType.price === "number" ? ` • $${selectedAppointmentType.price}` : ""}
                            {selectedAppointmentType.assignedResourceName ? ` • Default resource: ${selectedAppointmentType.assignedResourceName}` : ""}
                            {selectedAppointmentType.requiresWaiver ? " • Requires waiver" : ""}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Resource (optional)</label>
                    <Select
                        className="text-sm rs-container"
                        classNamePrefix="rs"
                        options={resourceOptionsRS}
                        value={selectedResourceOption}
                        onChange={(option: SingleValue<NumberOption>) =>
                            setValues((prev: any) => ({ ...prev, resourceId: option?.value ?? undefined }))
                        }
                        isClearable={!disableEdits}
                        placeholder={disableEdits ? "" : "None"}
                        noOptionsMessage={() => "No resources"}
                        isDisabled={disableEdits}
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        styles={rsStyles}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Start</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            value={fmtDate(values.startDate) || ""}
                            onChange={(e) => handleField("startDate", e.target.value)}
                            disabled={disableEdits}
                        />
                        <input
                            type="time"
                            className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            value={fmtTime(values.startTime) || ""}
                            onChange={(e) => handleField("startTime", e.target.value)}
                            disabled={disableEdits}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">End</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            value={fmtDate(values.endDate) || ""}
                            onChange={(e) => handleField("endDate", e.target.value)}
                            disabled={disableEdits}
                        />
                        <input
                            type="time"
                            className="border rounded-lg px-3 py-2 w-1/2 border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                            value={fmtTime(values.endTime) || ""}
                            onChange={(e) => handleField("endTime", e.target.value)}
                            disabled={disableEdits}
                        />
                    </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Notes</label>
                    <textarea
                        className="border rounded-lg px-3 py-2 min-h-[72px] border-slate-300 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                        value={values.notes || ""}
                        onChange={(e) => handleField("notes", e.target.value)}
                        placeholder={disableEdits ? "" : "optional notes"}
                        disabled={disableEdits}
                    />
                </div>
            </div>

            {/* Client-only footer action */}
            {isClientOnly && mode === "edit" && reservationId && userOwnsReservation && (
                <div className="mt-2 flex items-center justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 text-sm rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                        onClick={runClientCancel}
                        disabled={busyRef.current}
                        title="Cancel this appointment"
                    >
                        Cancel Appointment
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReservationModal;
