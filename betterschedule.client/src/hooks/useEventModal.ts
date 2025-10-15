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
import { isOverlapError } from "@/domain/calendar/errors";
import type { OrgSettingsDto } from "@/api/org-settings-api";

/** Client-side representation of a participant to be attached after create. */
export type PendingParticipantAdd = {
    role: "Client" | "ServiceProvider" | "Guest";
    userId?: string;
    guestName?: string;
    guestPhone?: string;
};

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
        (type === "blockedTime" && values?.createdByUserId && values.createdByUserId !== userId && !isManager);

    const canDelete = !readOnly && mode === "edit";

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
        setFormError(null);
    }

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

        setMode(canEdit ? "edit" : "create");
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
            pendingParticipants: Array.isArray(res?.pendingParticipants) ? res.pendingParticipants : [],
        });
        setOpen(true);
        setFormError(null);
    }

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

                    await updateReservation(resolveReservationId(values)!, payload);
                } else {
                    const clearedResourceByManager =
                        isManager &&
                        values?.originalResourceId != null &&
                        (values?.resourceId == null || values?.resourceId === "");

                    await updateBlockedTime(values.id, {
                        reason: values.reason ?? undefined,
                        startTime: start,
                        endTime: end,
                        ...(isManager
                            ? (clearedResourceByManager
                                ? { clearResource: true }
                                : {
                                    resourceId:
                                        typeof values.resourceId === "number"
                                            ? values.resourceId
                                            : values.resourceId
                                                ? Number(values.resourceId)
                                                : undefined,
                                })
                            : {}),
                        backColor: values.backColor ?? undefined,
                    });
                }
            } else {
                if (type === "reservation") {
                    let created: ReservationDto | null = null;

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

                    // Attach pending participants (if any)
                    const pending: PendingParticipantAdd[] = Array.isArray(values.pendingParticipants)
                        ? values.pendingParticipants
                        : [];

                    if (created && pending.length) {
                        const primaryClient = values.clientId as string | undefined;
                        const primaryProvider = values.serviceProviderId as string | undefined;

                        const tasks = pending.map((p) => {
                            if (p.role === "Client" && p.userId && p.userId === primaryClient) return Promise.resolve();
                            if (p.role === "ServiceProvider" && p.userId && p.userId === primaryProvider) return Promise.resolve();

                            if (p.role === "Guest") {
                                return addParticipant(created!.id, {
                                    role: "Guest",
                                    guestName: (p.guestName || "").trim() || undefined,
                                    guestPhone: (p.guestPhone || "").trim() || undefined,
                                });
                            }
                            if (p.userId) {
                                return addParticipant(created!.id, { role: p.role, userId: p.userId });
                            }
                            return Promise.resolve();
                        });

                        try {
                            await Promise.all(tasks);
                        } catch {
                            toast.warning("Reservation saved. Some participants could not be added.");
                        }
                    }
                } else {
                    await createBlockedTime({
                        reason: values.reason ?? "",
                        startTime: start,
                        endTime: end,
                        providerId: isManager ? (values.providerId || undefined) : undefined,
                        resourceId: isManager
                            ? (typeof values.resourceId === "number"
                                ? values.resourceId
                                : values.resourceId
                                    ? Number(values.resourceId)
                                    : undefined)
                            : undefined,
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
                (typeof err?.response?.data === "string" ? err.response.data : undefined) ||
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
