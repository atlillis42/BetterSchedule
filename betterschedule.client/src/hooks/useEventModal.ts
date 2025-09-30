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

        const startDp = new DayPilot.Date(start);
        const endDp = new DayPilot.Date(end);

        const providerForCheck =
            (isProvider && !isManager ? userId ?? undefined : undefined) ??
            (values.serviceProviderId || undefined) ??
            overlayProviderId;

        const resourceOnlyEditForManager =
            mode === "edit" &&
            type === "reservation" &&
            isManager &&
            values.startDate === values.originalStartDate &&
            values.startTime === values.originalStartTime &&
            values.endDate === values.originalEndDate &&
            values.endTime === values.originalEndTime &&
            (values.serviceProviderId || "") === (values.originalServiceProviderId || "") &&
            String(values.resourceId ?? "") !== String(values.originalResourceId ?? "");

        // Skip availability preflight for manager resource-only edits
        if (
            !resourceOnlyEditForManager &&
            org?.shadingMode === "ProviderAvailability" &&
            providerForCheck &&
            providerForCheck === overlayProviderId
        ) {
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
                        } else if (isCancelWindowError(err)) {
                            // allow manager or assigned provider override
                            const eventProviderId =
                                (values?.serviceProviderId ? String(values.serviceProviderId) : undefined) ??
                                (values?.originalServiceProviderId ? String(values.originalServiceProviderId) : undefined) ??
                                (values?.reservation?.serviceProviderId ? String(values.reservation.serviceProviderId) : undefined);

                            const isAssignedProvider = !!userId && !!eventProviderId && String(userId) === eventProviderId;

                            if (isManager) {
                                const ok = window.confirm("This update is within the organization’s change window. Override and proceed?");
                                if (!ok) throw err;
                                await updateReservation(resolveReservationId(values)!, payload, { managerOverride: true });
                            } else if (isProvider && isAssignedProvider) {
                                const ok = window.confirm("This update is within the change window. Proceed as the assigned provider?");
                                if (!ok) throw err;
                                await updateReservation(resolveReservationId(values)!, payload, { providerOverride: true });
                            } else {
                                throw err;
                            }
                        } else {
                            throw err;
                        }
                    }
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
                        // Manager may supply providerId/resourceId according to your modal;
                        // Providers create self-blocks (server infers createdByUserId).                        
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

        const computeInsideWindowFallback = (): boolean => {
            try {
                const startIso = combineDateTime(values.startDate, values.startTime).iso as string;
                const start = new Date(startIso).getTime();
                const now = Date.now();
                const hours = org?.cancelWindowHours ?? 24;
                return start - now < hours * 60 * 60 * 1000;
            } catch {
                return false;
            }
        };

        try {
            if (type === "reservation") {
                const id = resolveReservationId(values)!;
                await deleteReservation(id); // first attempt
            } else {
                await deleteBlockedTime(values.id);
            }
            setOpen(false);
            await refreshEvents();
        } catch (err: any) {
            const message = (err instanceof Error && err.message) || "";
            const status =
                (err as any)?.status ??
                (err as any)?.response?.status as number | undefined;

            const looksLikeInsideWindowMsg =
                /within\s+\d+\s*hours/i.test(message) ||
                /cannot be (deleted|modified) within/i.test(message);

            const insideWindow = looksLikeInsideWindowMsg || computeInsideWindowFallback();

            if (type === "reservation" && insideWindow && status === 400) {
                const windowHours = org?.cancelWindowHours ?? 24;

                const eventProviderId =
                    (values?.serviceProviderId ? String(values.serviceProviderId) : undefined) ??
                    (values?.originalServiceProviderId ? String(values.originalServiceProviderId) : undefined) ??
                    (values?.reservation?.serviceProviderId ? String(values.reservation.serviceProviderId) : undefined);

                const isAssignedProvider = !!userId && !!eventProviderId && String(userId) === eventProviderId;

                const canManagerOverride = !!isManager;
                const canProviderOverride = !!isProvider && isAssignedProvider;

                if (canManagerOverride || canProviderOverride) {
                    const ok = window.confirm(
                        `This reservation is within the ${windowHours}h change window. ` +
                        (canManagerOverride
                            ? "Proceed with a manager override to delete?"
                            : "Proceed as the assigned provider to delete?")
                    );
                    if (!ok) return;

                    try {
                        const id = resolveReservationId(values)!;
                        await deleteReservation(id, {
                            managerOverride: canManagerOverride,
                            providerOverride: !canManagerOverride && canProviderOverride,
                        });
                        setOpen(false);
                        await refreshEvents();
                        return;
                    } catch (err2: any) {
                        const msg2 =
                            (err2 instanceof Error && err2.message) ||
                            (err2?.response?.data?.message as string | undefined) ||
                            "We couldn't delete this reservation.";
                        toast.error(msg2);
                        setFormError(msg2);
                        return;
                    }
                }
            }

            const fallback =
                message ||
                (typeof (err as any)?.response?.data === "string" ? (err as any).response.data : undefined) ||
                "Failed to delete reservation.";
            toast.error(fallback);
            setFormError(fallback);
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
