import { useState } from "react";
import { toast } from "react-toastify";
import { DayPilot } from "@daypilot/daypilot-lite-react";

import { combineDateTime } from "@/utilities/conversions/dateParsing";
import { extractEventFields } from "@/utilities/formFields/extractEventFields";
import { validateReservation, validateBlockedTime } from "@/utilities/formFields";

import {
    createReservation,
    updateReservation,
    deleteReservation,
    type ReservationDto,
} from "@/api/reservation-api";
import {
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime,
} from "@/api/blockedtime-api";

import { addParticipant } from "@/api/reservation-participants-api";
import { preflightAvailability, type AvailabilityMap } from "@/services/availabilityService";
import { isOutsideAvailabilityError, isCancelWindowError, isOverlapError } from "@/domain/calendar/errors";
import type { OrgSettingsDto } from "@/api/org-settings-api";

/** Client-side representation of a participant to be attached after create. */
export type PendingParticipantAdd = {
    role: "Client" | "ServiceProvider" | "Guest";
    /** Required for Client/ServiceProvider; omit for Guest. */
    userId?: string;
    /** Guests only. */
    guestName?: string;
    /** Guests only. */
    guestPhone?: string;
};

/**
 * Extracts a numeric reservation id from a variety of shapes:
 * - number (e.g., 42)
 * - string with trailing digits (e.g., "reservation-42")
 * - object path (values.reservation?.id)
 */
function resolveReservationId(values: any): number | undefined {
    if (typeof values?.reservation?.id === "number") return values.reservation.id;
    const raw = values?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
        const m = raw.match(/(\d+)$/);
        if (m) return Number(m[1]);
    }
    return undefined;
}

/**
 * Coordinates Event modal state and actions (create/edit reservation or blocked time).
 * Encapsulates validation, availability preflight, and API mutation flows.
 *
 * In Reservation "create" mode, any `values.pendingParticipants` are attached immediately
 * after the reservation is created (clients, providers, and guests).
 */
export function useEventModal(params: {
    canManageReservations: boolean;
    canManageBlocks: boolean;
    isProvider: boolean;
    isManager: boolean;
    userId?: string | null;
    org: OrgSettingsDto | null;
    overlayProviderId?: string;
    availabilityByProvider: AvailabilityMap;
    refreshEvents: () => Promise<void>;
}) {
    const {
        canManageReservations,
        canManageBlocks,
        isProvider,
        isManager,
        userId,
        org,
        overlayProviderId,
        availabilityByProvider,
        refreshEvents,
    } = params;

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [type, setType] = useState<"reservation" | "blockedTime">("reservation");
    const [values, setValues] = useState<any>({});
    const [formError, setFormError] = useState<string | null>(null);

    const readOnly =
        (type === "reservation" && !canManageReservations) ||
        (type === "blockedTime" && values?.createdByUserId && values.createdByUserId !== userId && !isManager);

    const canDelete = !readOnly && mode === "edit";

    /**
     * Handles "click a free time range" → primes default fields and opens the modal.
     * Uses DayPilot's local formatting to avoid timezone drift.
     */
    function onTimeRangeSelected(args: { start: DayPilot.Date; end: DayPilot.Date; resource?: number | string }) {
        if (!canManageReservations) return;

        setType("reservation");
        setMode("create");
        setValues({
            startDate: args.start.toString("yyyy-MM-dd"),
            startTime: args.start.toString("HH:mm"),
            endDate: args.end.toString("yyyy-MM-dd"),
            endTime: args.end.toString("HH:mm"),
            resourceId: args.resource ? Number(args.resource) : undefined,
            serviceProviderId: isProvider && !isManager ? userId : "",
            type: "reservation",
            participants: [],
            /** For create-mode group reservations: attach after create. */
            pendingParticipants: [] as PendingParticipantAdd[],
        });
        setOpen(true);
        setFormError(null);
    }

    /**
     * Handles "click an existing event" → loads fields for edit.
     * Keeps compatibility with domain-style event IDs (e.g., "reservation-123").
     */
    function onEventClick(args: any) {
        const t = args.e?.type || args.e?.data?.type || "reservation";
        const createdByUserId = args.e?.createdByUserId || args.e?.data?.createdByUserId;

        const isOwnBlock = t === "blockedTime" && (!createdByUserId || createdByUserId === userId);
        const canEdit =
            (t === "reservation" && canManageReservations) ||
            (t === "blockedTime" && (isManager || isOwnBlock));

        const res = args.e?.data?.reservation;
        if (t === "reservation" && isProvider && !isManager && res?.serviceProviderId && res.serviceProviderId !== userId) {
            toast.info("You’re viewing another provider’s event. Switch provider or ask a manager to edit.");
        }

        setMode(canEdit ? "edit" : "create");
        setType(t);
        setValues({
            ...extractEventFields(args.e),
            id: args.e.id, // can be number or domain string; downstream is resilient
            type: t,
            clientId: res?.clientId || "",
            serviceProviderId: res?.serviceProviderId || "",
            appointmentTypeId: res?.appointmentTypeId,
            notes: res?.notes || "",
            resourceId: res?.resourceId ?? undefined,
            participants: res?.participants || [],
            /** Ensure this exists so the modal can add pending participants in create mode if user switches tabs. */
            pendingParticipants: Array.isArray(res?.pendingParticipants) ? res.pendingParticipants : [],
        });
        setOpen(true);
        setFormError(null);
    }

    /**
     * Saves the current modal contents.
     * - Reservation: validates, checks availability overlay, and then creates/updates.
     *   When creating and `values.pendingParticipants` exist, attaches them immediately after create.
     * - Blocked time: creates/updates accordingly.
     */
    async function submit() {
        if (type === "reservation" && !canManageReservations) {
            toast.info("You don’t have permission to save reservations.");
            return;
        }
        if (type === "blockedTime" && !canManageBlocks) {
            toast.info("You don’t have permission to save blocked times.");
            return;
        }

        const validate = type === "reservation" ? validateReservation : validateBlockedTime;
        const validationError = validate(values);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const start = combineDateTime(values.startDate, values.startTime).iso as string;
        const end = combineDateTime(values.endDate, values.endTime).iso as string;

        const startDp = new DayPilot.Date(start);
        const endDp = new DayPilot.Date(end);

        const providerForCheck =
            (isProvider && !isManager ? userId ?? undefined : undefined) ??
            (values.serviceProviderId || undefined) ??
            overlayProviderId;

        if (org?.shadingMode === "ProviderAvailability" && providerForCheck && providerForCheck === overlayProviderId) {
            const { allowed } = preflightAvailability(availabilityByProvider, providerForCheck, startDp, endDp);
            if (!allowed) {
                const msg = "Selected time is outside provider availability.";
                if (isProvider && !isManager) {
                    setFormError(msg);
                    toast.error(msg);
                    return;
                }
                toast.warning(msg);
            }
        }

        try {
            if (mode === "edit") {
                if (type === "reservation") {
                    const payload = {
                        notes: values.notes ?? undefined,
                        startTime: start,
                        endTime: end,
                        resourceId:
                            typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined,
                        serviceProviderId: values.serviceProviderId || undefined,
                        appointmentTypeId: values.appointmentTypeId ? Number(values.appointmentTypeId) : undefined,
                    };

                    try {
                        await updateReservation(resolveReservationId(values)!, payload);
                    } catch (err: any) {
                        if (isOutsideAvailabilityError(err)) {
                            const ok = window.confirm("This is outside provider availability. Proceed anyway?");
                            if (!ok) throw err;
                            await updateReservation(resolveReservationId(values)!, payload, { overrideAvailability: true });
                        } else if (isCancelWindowError(err) && isManager) {
                            const ok = window.confirm("This is inside the organization’s change window. Override and proceed?");
                            if (!ok) throw err;
                            await updateReservation(resolveReservationId(values)!, payload, { managerOverride: true });
                        } else {
                            throw err;
                        }
                    }
                } else {
                    await updateBlockedTime(values.id, {
                        reason: values.reason ?? undefined,
                        resourceId:
                            typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined,
                        startTime: start,
                        endTime: end,
                        backColor: values.backColor ?? undefined,
                    });
                }
            } else {
                if (type === "reservation") {
                    let created: ReservationDto | null = null;

                    // 1) Create the reservation
                    try {
                        created = await createReservation({
                            clientId: values.clientId,
                            serviceProviderId: values.serviceProviderId,
                            appointmentTypeId: Number(values.appointmentTypeId),
                            startTime: start,
                            endTime: end,
                            notes: values.notes ?? "",
                            resourceId:
                                typeof values.resourceId === "number"
                                    ? values.resourceId
                                    : values.resourceId
                                        ? Number(values.resourceId)
                                        : undefined,
                        });
                    } catch (err: any) {
                        if (isOutsideAvailabilityError(err)) {
                            const ok = window.confirm("This is outside provider availability. Proceed anyway?");
                            if (!ok) throw err;
                            created = await createReservation(
                                {
                                    clientId: values.clientId,
                                    serviceProviderId: values.serviceProviderId,
                                    appointmentTypeId: Number(values.appointmentTypeId),
                                    startTime: start,
                                    endTime: end,
                                    notes: values.notes ?? "",
                                    resourceId:
                                        typeof values.resourceId === "number"
                                            ? values.resourceId
                                            : values.resourceId
                                                ? Number(values.resourceId)
                                                : undefined,
                                },
                                { overrideAvailability: true }
                            );
                        } else {
                            throw err;
                        }
                    }

                    // 2) Attach any pending participants (clients/providers/guests)
                    const pending: PendingParticipantAdd[] = Array.isArray(values.pendingParticipants)
                        ? values.pendingParticipants
                        : [];

                    if (created && pending.length) {
                        const primaryClient = values.clientId as string | undefined;
                        const primaryProvider = values.serviceProviderId as string | undefined;

                        const tasks = pending.map((p) => {
                            // Skip duplicates of primaries
                            if (p.role === "Client" && p.userId && p.userId === primaryClient) return Promise.resolve();
                            if (p.role === "ServiceProvider" && p.userId && p.userId === primaryProvider) return Promise.resolve();

                            if (p.role === "Guest") {
                                return addParticipant(created!.id, {
                                    role: "Guest",
                                    guestName: (p.guestName || "").trim() || undefined,
                                    guestPhone: (p.guestPhone || "").trim() || undefined,
                                });
                            }
                            // Client/ServiceProvider
                            if (p.userId) {
                                return addParticipant(created!.id, {
                                    role: p.role,
                                    userId: p.userId,
                                });
                            }
                            return Promise.resolve();
                        });

                        try {
                            await Promise.all(tasks);
                        } catch (err) {
                            // If any participant add fails, we still keep the created reservation;
                            // surface a warning and proceed to refresh.
                            toast.warning("Reservation saved. Some participants could not be added.");
                        }
                    }
                } else {
                    await createBlockedTime({
                        reason: values.reason ?? "",
                        resourceId:
                            typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined,
                        startTime: start,
                        endTime: end,
                        backColor: values.backColor ?? undefined,
                    });
                }
            }

            setOpen(false);
            await refreshEvents();
        } catch (err: any) {
            if (isOverlapError(err)) {
                const message = err?.response?.data?.message ?? "Time overlaps with another item.";
                setFormError(message);
                toast.error(message);
                return;
            }

            if (err?.response?.status === 403) {
                toast.error("You don’t have permission to perform this action.");
            } else {
                const message =
                    (err instanceof Error && err.message) ||
                    (err?.response?.data?.message as string | undefined) ||
                    (typeof err?.response?.data === "string" ? err.response.data : undefined);
                if (message) setFormError(message);
                else toast.error("Something went wrong. Please try again.");
            }
        }
    }

    /** Deletes the current entity. */
    async function remove() {
        if (type === "reservation" && !canManageReservations) {
            toast.info("You don’t have permission to delete reservations.");
            return;
        }
        if (type === "blockedTime" && !canManageBlocks) {
            toast.info("You don’t have permission to delete blocked times.");
            return;
        }

        if (type === "reservation") {
            await deleteReservation(resolveReservationId(values)!);
        } else {
            await deleteBlockedTime(values.id);
        }
        setOpen(false);
        await refreshEvents();
    }

    return {
        // state
        open,
        setOpen,
        mode,
        setMode,
        type,
        setType,
        values,
        setValues,
        formError,
        setFormError,

        // derived
        readOnly,
        canDelete,

        // handlers
        onTimeRangeSelected,
        onEventClick,
        submit,
        remove,
    };
}
