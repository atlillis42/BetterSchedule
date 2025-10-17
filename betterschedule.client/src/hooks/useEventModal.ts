import { useState } from "react";
import { toast } from "react-toastify";
import { DayPilot } from "@daypilot/daypilot-lite-react";

import { combineDateTime } from "@/utilities/conversions/dateParsing";
import { extractEventFields } from "@/utilities/formFields/extractEventFields";
import { validateReservation, validateBlockedTime } from "@/utilities/formFields";

import {
    deleteReservation,
    type ReservationDto,
} from "@/api/reservation-api";
import {
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime,
} from "@/api/blockedtime-api";

import { addParticipant } from "@/api/reservation-participants-api";
import { isOverlapError } from "@/domain/calendar/errors";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import { saveReservationWithConfirm } from "@/services/warnConfirm";

/**
 * Participant to be attached after a reservation is created.
 *
 * @public
 */
export type PendingParticipantAdd = {
    role: "Client" | "ServiceProvider" | "Guest";
    userId?: string;
    guestName?: string;
    guestPhone?: string;
};

/**
 * Attempts to resolve a reservation id from various shapes used in modal state.
 *
 * @param values - Arbitrary modal values object
 * @returns Numeric id if present; otherwise `undefined`
 * @internal
 */
function resolveReservationId(values: any): number | undefined {
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

/**
 * Event editor state and actions for reservations and blocked times.
 *
 * Responsibilities:
 * - Open/edit/create flows for reservations and blocked time.
 * - Validation and server persistence.
 * - Staff warning/override flow via {@link saveReservationWithConfirm}.
 *
 * Security:
 * - Visibility/permissions are enforced by the caller (via flags) and revalidated by the API.
 *
 * @param params.canManageReservations - Staff flag for reservation create/update/delete
 * @param params.canManageBlocks - Staff flag for blocked time create/update/delete
 * @param params.isProvider - Whether current user is a provider
 * @param params.isManager - Whether current user is a manager
 * @param params.userId - Current user id (if authenticated)
 * @param params.org - Organization settings (lead-time & override behavior consumed)
 * @param params.refreshEvents - Reloads calendar data on success
 * @returns Modal editing API used by the calendar shell
 * @public
 */
export function useEventModal(params: {
    canManageReservations: boolean;
    canManageBlocks: boolean;
    isProvider: boolean;
    isManager: boolean;
    userId?: string | null;
    org: OrgSettingsDto | null;
    refreshEvents: () => Promise<void>;
}) {
    const {
        canManageReservations,
        canManageBlocks,
        isProvider,
        isManager,
        userId,
        org,
        refreshEvents,
    } = params;

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [type, setType] = useState<"reservation" | "blockedTime">("reservation");
    const [values, setValues] = useState<any>({});
    const [formError, setFormError] = useState<string | null>(null);

    const readOnly =
        (type === "reservation" && !canManageReservations) ||
        (type === "blockedTime" &&
            values?.createdByUserId &&
            values.createdByUserId !== userId &&
            !isManager);

    const canDelete = !readOnly && mode === "edit";

    /**
     * Initializes a new reservation at the selected range.
     *
     * @param args - DayPilot selection payload
     */
    function onTimeRangeSelected(args: {
        start: DayPilot.Date;
        end: DayPilot.Date;
        resource?: number | string;
    }) {
        // Allow clients to select; saving is permission-gated in submit().
        setType("reservation");
        setMode("create");
        setValues({
            startDate: args.start.toString("yyyy-MM-dd"),
            startTime: args.start.toString("HH:mm"),
            endDate: args.end.toString("yyyy-MM-dd"),
            endTime: args.end.toString("HH:mm"),
            resourceId: args.resource ? Number(args.resource) : undefined,
            serviceProviderId: isProvider && !isManager ? (userId ?? "") : "",
            clientId: "", // set during form editing; kept for typing consistency
            type: "reservation",
            participants: [],
            pendingParticipants: [] as PendingParticipantAdd[],

            reservationId: undefined,
            status: undefined,
            originalServiceProviderId: undefined,
            originalResourceId: undefined,
            originalStartDate: undefined,
            originalStartTime: undefined,
            originalEndDate: undefined,
            originalEndTime: undefined,
        });
        setOpen(true);

        // Friendly banner for clients
        if (!canManageReservations) {
            setFormError("Client self-booking will be implemented in the future.");
        } else {
            setFormError(null);
        }
    }

    /**
     * Opens an existing calendar item for edit (reservation or blocked time).
     *
     * @param args - DayPilot event click payload
     */
    function onEventClick(args: any) {
        const t = args.e?.type || args.e?.data?.type || "reservation";
        const createdByUserId =
            args.e?.createdByUserId || args.e?.data?.createdByUserId;

        const isOwnBlock =
            t === "blockedTime" &&
            (!createdByUserId || createdByUserId === userId);

        const res = args.e?.data?.reservation;

        if (
            t === "reservation" &&
            isProvider &&
            !isManager &&
            res?.serviceProviderId &&
            res.serviceProviderId !== userId
        ) {
            toast.info(
                "You’re viewing another provider’s event. Switch provider or ask a manager to edit."
            );
        }

        const parsedId =
            typeof res?.id === "number"
                ? res.id
                : (() => {
                    const raw = args.e?.id ?? args.e?.data?.id;
                    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
                    if (typeof raw === "string") {
                        const m = raw.match(/(\d+)$/);
                        if (m) return Number(m[1]);
                    }
                    return undefined;
                })();

        const base = extractEventFields(args.e);

        // Always open in edit; `readOnly` disables controls for clients.
        setMode("edit");
        setType(t);
        setValues({
            ...base,
            id: args.e.id,
            reservationId: t === "reservation" ? parsedId : undefined,
            status: t === "reservation" ? res?.status : undefined,

            type: t,
            clientId: res?.clientId || "",
            serviceProviderId: res?.serviceProviderId || "",
            originalServiceProviderId: res?.serviceProviderId || "",
            appointmentTypeId: res?.appointmentTypeId,
            notes: res?.notes || "",
            resourceId: res?.resourceId ?? undefined,

            originalResourceId: res?.resourceId ?? undefined,
            originalStartDate: base.startDate,
            originalStartTime: base.startTime,
            originalEndDate: base.endDate,
            originalEndTime: base.endTime,

            participants: res?.participants || [],
            pendingParticipants: Array.isArray(res?.pendingParticipants)
                ? res.pendingParticipants
                : [],
        });
        setOpen(true);
        setFormError(null);

        // Optional FYI for non-editable cases.
        if (
            !(
                (t === "reservation" && canManageReservations) ||
                (t === "blockedTime" && (isManager || isOwnBlock))
            )
        ) {
            // toast.info("You can view details, but you don't have permission to edit.");
        }
    }

    /**
     * Persists the current modal values.
     * - For reservations, performs preflight checks and conditional confirmation
     *   via {@link saveReservationWithConfirm}, then commits.
     * - For blocked time, calls the standard create/update endpoints (server
     *   will hard-fail on overlaps; UI surfaces a banner and toast).
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

        const validate =
            type === "reservation" ? validateReservation : validateBlockedTime;
        const validationError = validate(values);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const start = combineDateTime(values.startDate, values.startTime).iso as string;
        const end = combineDateTime(values.endDate, values.endTime).iso as string;

        try {
            if (mode === "edit") {
                if (type === "reservation") {
                    // --- Reservation update with preflight + confirm + commit ---
                    const id = resolveReservationId(values)!;

                    // Include clientId and appointmentTypeId for typing (intersection requires them).
                    const payload = {
                        clientId: String(values.clientId || ""),
                        serviceProviderId: String(values.serviceProviderId || ""),
                        appointmentTypeId: Number(values.appointmentTypeId),
                        startTime: start,
                        endTime: end,
                        resourceId:
                            typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined,
                        notes: values.notes ?? undefined,
                    };

                    await saveReservationWithConfirm({
                        org: {
                            minLeadMinutes: org?.minLeadMinutes ?? 0,
                            requireConfirmOnOverrides: org?.requireConfirmOnOverrides ?? false,
                        },
                        mode: "update",
                        id,
                        payload,
                        onSuccess: (m) => toast.success(m),
                        onWarn: (m) => toast.info(m),
                    });
                } else {
                    // --- Blocked time update (hard-blocked by server on conflicts) ---
                    const clearedResourceByManager =
                        isManager &&
                        values?.originalResourceId != null &&
                        (values?.resourceId == null || values?.resourceId === "");

                    await updateBlockedTime(values.id, {
                        reason: values.reason ?? undefined,
                        startTime: start,
                        endTime: end,
                        ...(isManager
                            ? clearedResourceByManager
                                ? { clearResource: true }
                                : {
                                    resourceId:
                                        typeof values.resourceId === "number"
                                            ? values.resourceId
                                            : values.resourceId
                                                ? Number(values.resourceId)
                                                : undefined,
                                }
                            : {}),
                        backColor: values.backColor ?? undefined,
                    });
                }
            } else {
                if (type === "reservation") {
                    // --- Reservation create with preflight + confirm + commit ---
                    const payload = {
                        clientId: String(values.clientId || ""),
                        serviceProviderId: String(values.serviceProviderId || ""),
                        appointmentTypeId: Number(values.appointmentTypeId),
                        startTime: start,
                        endTime: end,
                        notes: String(values.notes ?? ""),
                        resourceId:
                            typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined,
                    };

                    const created = (await saveReservationWithConfirm({
                        org: {
                            minLeadMinutes: org?.minLeadMinutes ?? 0,
                            requireConfirmOnOverrides: org?.requireConfirmOnOverrides ?? false,
                        },
                        mode: "create",
                        payload,
                        onSuccess: (m) => toast.success(m),
                        onWarn: (m) => toast.info(m),
                    })) as ReservationDto | void;

                    // Attach pending participants (best-effort), if any.
                    const pending: PendingParticipantAdd[] = Array.isArray(
                        values.pendingParticipants
                    )
                        ? values.pendingParticipants
                        : [];

                    if (created && pending.length) {
                        const primaryClient = values.clientId as string | undefined;
                        const primaryProvider = values.serviceProviderId as string | undefined;

                        const tasks = pending.map((p) => {
                            if (p.role === "Client" && p.userId && p.userId === primaryClient)
                                return Promise.resolve();
                            if (
                                p.role === "ServiceProvider" &&
                                p.userId &&
                                p.userId === primaryProvider
                            )
                                return Promise.resolve();

                            if (p.role === "Guest") {
                                return addParticipant(created.id, {
                                    role: "Guest",
                                    guestName: (p.guestName || "").trim() || undefined,
                                    guestPhone: (p.guestPhone || "").trim() || undefined,
                                });
                            }
                            if (p.userId) {
                                return addParticipant(created.id, { role: p.role, userId: p.userId });
                            }
                            return Promise.resolve();
                        });

                        try {
                            await Promise.all(tasks);
                        } catch {
                            toast.warning(
                                "Reservation saved. Some participants could not be added."
                            );
                        }
                    }
                } else {
                    // --- Blocked time create (hard-blocked by server on conflicts) ---
                    await createBlockedTime({
                        reason: values.reason ?? "",
                        startTime: start,
                        endTime: end,
                        providerId: isManager ? values.providerId || undefined : undefined,
                        resourceId: isManager
                            ? typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined
                            : undefined,
                        backColor: values.backColor ?? undefined,
                    });
                }
            }

            setOpen(false);
            await refreshEvents();
        } catch (err: any) {
            // Server-side overlap/conflict codes: surface as inline error + toast
            if (isOverlapError(err)) {
                const message =
                    err?.response?.data?.message ?? "Time overlaps with another item.";
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
                    (typeof err?.response?.data === "string"
                        ? err.response.data
                        : undefined);
                if (message) setFormError(message);
                else toast.error("Something went wrong. Please try again.");
            }
        }
    }

    /**
     * Deletes the currently edited item (reservation or blocked time).
     * Permission gates are re-checked server-side.
     */
    async function remove() {
        if (type === "reservation" && !canManageReservations) {
            toast.info("You don’t have permission to delete reservations.");
            return;
        }
        if (type === "blockedTime" && !canManageBlocks) {
            toast.info("You don’t have permission to delete blocked times.");
            return;
        }

        try {
            if (type === "reservation") {
                const id = resolveReservationId(values)!;
                await deleteReservation(id);
            } else {
                await deleteBlockedTime(values.id);
            }
            setOpen(false);
            await refreshEvents();
        } catch (err: any) {
            const message =
                (err instanceof Error && err.message) ||
                (typeof err?.response?.data === "string"
                    ? err.response.data
                    : undefined) ||
                (err?.response?.data?.message as string | undefined) ||
                "Failed to delete.";
            toast.error(message);
            setFormError(message);
        }
    }

    return {
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
        readOnly,
        canDelete,
        onTimeRangeSelected,
        onEventClick,
        submit,
        remove,
    };
}
