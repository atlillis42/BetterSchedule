import { useState } from "react";
import { toast } from "react-toastify";
import { DayPilot } from "@daypilot/daypilot-lite-react";

import { getLocalDateString, getLocalTimeString, combineDateTime } from "@/utilities/conversions/dateParsing";
import { extractEventFields } from "@/utilities/legacy/extractEventFields";
import { validateReservation, validateBlockedTime } from "@/utilities/formFields";

import {
    createReservation,
    updateReservation,
    deleteReservation,
} from "@/api/reservation-api";
import {
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime,
} from "@/api/blockedtime-api";

import { preflightAvailability, type AvailabilityMap } from "@/services/availabilityService";
import { isOutsideAvailabilityError, isCancelWindowError, isOverlapError } from "@/domain/calendar/errors";
import type { OrgSettingsDto } from "@/api/org-settings-api";

/**
 * Coordinates Event modal state and actions (create/edit reservation or blocked time).
 * Encapsulates validation, availability preflight, and API mutation flows.
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

    function onTimeRangeSelected(args: { start: DayPilot.Date; end: DayPilot.Date; resource?: number | string }) {
        if (!canManageReservations) return;

        setType("reservation");
        setMode("create");
        setValues({
            startDate: getLocalDateString(args.start),
            startTime: getLocalTimeString(args.start),
            endDate: getLocalDateString(args.end),
            endTime: getLocalTimeString(args.end),
            resourceId: args.resource ? Number(args.resource) : undefined,
            serviceProviderId: isProvider && !isManager ? userId : "",
            type: "reservation",
            participants: [],
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

        setMode(canEdit ? "edit" : "create");
        setType(t);
        setValues({
            ...extractEventFields(args.e),
            id: args.e.id,
            type: t,
            clientId: res?.clientId || "",
            serviceProviderId: res?.serviceProviderId || "",
            appointmentTypeId: res?.appointmentTypeId,
            notes: res?.notes || "",
            resourceId: res?.resourceId ?? undefined,
            participants: res?.participants || [],
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
                    try {
                        await updateReservation(values.id, {
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
                        });
                    } catch (err: any) {
                        if (isOutsideAvailabilityError(err)) {
                            const ok = window.confirm("This is outside provider availability. Proceed anyway?");
                            if (!ok) throw err;
                            await updateReservation(
                                values.id,
                                {
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
                                },
                                { overrideAvailability: true }
                            );
                        } else if (isCancelWindowError(err) && isManager) {
                            const ok = window.confirm("This is inside the organization’s change window. Override and proceed?");
                            if (!ok) throw err;
                            await updateReservation(
                                values.id,
                                {
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
                                },
                                { managerOverride: true }
                            );
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
                    try {
                        await createReservation({
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
                            await createReservation(
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
            await deleteReservation(values.id);
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
