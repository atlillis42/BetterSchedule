import { useCallback, useMemo } from "react";
import "@styles/Calendar.css";
import { toast } from "react-toastify";

import { useAuth } from "@/components/auth/AuthContext";
import CalendarNavigatorPane from "./CalendarNavigatorPane";
import CalendarToolbar from "./CalendarToolbar";
import CalendarLegend from "./CalendarLegend";
import CalendarBody from "./CalendarBody";
import EventModal from "@/components/modals/EventModal";

import { useCalendarData } from "@/hooks/useCalendarData";
import { useAvailabilityOverlay } from "@/hooks/useAvailabilityOverlay";
import { useCalendarView } from "@/hooks/useCalendarView";
import { useEventModal } from "@/hooks/useEventModal";
import { filterEventsByCanceled } from "@/services/eventsService";
import { buildBusinessHours } from "@/services/availabilityService";

import {
    isWithinBusinessHours,
    isRangeAllowedForProvider,
    deriveBusinessHoursFromAvailability,
} from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

import type { UiEvent, CalendarResource, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";
import type { ProviderLite } from "@/services/providersService";

/**
 * Root calendar component that composes data sources, DayPilot callbacks, and modal handlers.
 * Enforces provider availability without cell shading by combining DayPilot business-hours clamping
 * with interaction gating (selecting/move/resize) and concise toasts explaining rejections.
 */
const Calendar = () => {
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    const { org, view, setView, startDate, setStartDate, tzLabel, goToday } = useCalendarView();
    const { resources, events, providers, refreshEvents } = useCalendarData(startDate, view);
    const { overlayProviderId, setOverlayProviderId, availabilityByProvider } = useAvailabilityOverlay(
        isProvider ? userId ?? undefined : undefined
    );

    const {
        open,
        setOpen,
        mode,
        type,
        setType,
        values,
        setValues,
        formError,
        readOnly,
        canDelete,
        onTimeRangeSelected: onTimeRangeSelectedFromModal,
        onEventClick,
        submit,
        remove,
    } = useEventModal({
        canManageReservations,
        canManageBlocks,
        isProvider,
        isManager,
        userId,
        org,
        overlayProviderId,
        availabilityByProvider,
        refreshEvents,
    });

    const visibleEvents = useMemo(() => filterEventsByCanceled(events, false), [events]);

    const orgBusiness = useMemo(() => buildBusinessHours(org), [org]);

    // Provider context: overlay wins; otherwise the logged-in provider (if applicable).
    const activeProviderId = useMemo(
        () => overlayProviderId ?? (isProvider ? userId ?? undefined : undefined),
        [overlayProviderId, isProvider, userId]
    );

    // Optional: tighten visible business hours using provider rules (still gated at interaction).
    const effectiveBusinessBand = useMemo(() => {
        const providerRules = activeProviderId ? availabilityByProvider.get(activeProviderId) : undefined;
        const band = deriveBusinessHoursFromAvailability(
            providerRules ?? null,
            orgBusiness?.startHHmm,
            orgBusiness?.endHHmm
        );
        return band ?? orgBusiness ?? null;
    }, [activeProviderId, availabilityByProvider, orgBusiness]);

    const businessBeginsHour = useMemo(
        () => (effectiveBusinessBand ? parseInt(effectiveBusinessBand.startHHmm.slice(0, 2), 10) : undefined),
        [effectiveBusinessBand]
    );
    const businessEndsHour = useMemo(
        () => (effectiveBusinessBand ? parseInt(effectiveBusinessBand.endHHmm.slice(0, 2), 10) : undefined),
        [effectiveBusinessBand]
    );

    type DisallowReason = "org" | "provider";

    /**
     * Resolve the provider ID to validate for a given DayPilot callback.
     * Prefers the event's own provider (for move/resize), then falls back to the active context (overlay/self).
     */
    const resolveProviderForArgs = useCallback(
        (args: any): string | undefined => {
            const data = args?.e?.data ?? args?.event?.data ?? args?.data;
            const fromEvent: string | undefined =
                data?.providerId ?? data?.provider?.id ?? undefined;
            return fromEvent ?? activeProviderId;
        },
        [activeProviderId]
    );

    /**
     * Determines allow/deny and reason for a proposed time range for a specific provider.
     */
    const checkRangeAllowed = useCallback(
        (
            start: unknown,
            end: unknown,
            providerIdOverride?: string
        ): { allowed: true } | { allowed: false; reason: DisallowReason } => {
            if (orgBusiness) {
                const withinBusiness = isWithinBusinessHours(
                    start,
                    end,
                    orgBusiness.startHHmm,
                    orgBusiness.endHHmm,
                    org?.timeZoneId
                );
                if (!withinBusiness) return { allowed: false, reason: "org" };
            }
            const targetProviderId = providerIdOverride ?? activeProviderId;
            const providerOk = isRangeAllowedForProvider(
                availabilityByProvider,
                targetProviderId,
                start,
                end,
                org?.timeZoneId
            );
            if (!providerOk) return { allowed: false, reason: "provider" };
            return { allowed: true };
        },
        [orgBusiness, org?.timeZoneId, availabilityByProvider, activeProviderId]
    );

    /**
     * Emits a concise toast based on the disallow reason.
     */
    const notifyBlock = useCallback((reason: DisallowReason) => {
        if (reason === "org") {
            toast.info(Messages.OutsideOrgBusinessHours);
        } else {
            toast.info(Messages.OutsideProviderAvailability);
        }
    }, []);

    // Selection guard for Month/Day/Week (toast only on commit). Provider is unknown at selection time; use context.
    const onTimeRangeSelectedGuarded = useCallback(
        (args: CalendarTimeRangeSelectedArgs) => {
            const result = checkRangeAllowed(args.start, args.end, activeProviderId);
            if (result.allowed) {
                onTimeRangeSelectedFromModal(args);
            } else {
                notifyBlock(result.reason);
            }
        },
        [checkRangeAllowed, notifyBlock, onTimeRangeSelectedFromModal, activeProviderId]
    );

    // Live selection gating (no toast here to avoid spam).
    const onTimeRangeSelecting = useCallback(
        (args: any) => {
            const result = checkRangeAllowed(args.start, args.end, activeProviderId);
            args.allowed = result.allowed;
        },
        [checkRangeAllowed, activeProviderId]
    );

    // Drag/resize gating for existing events (toast on commit). Validate against the event's provider.
    const onEventMove = useCallback(
        (args: any) => {
            const providerId = resolveProviderForArgs(args);
            const result = checkRangeAllowed(args.newStart, args.newEnd, providerId);
            args.allowed = result.allowed;
            if (!result.allowed) notifyBlock(result.reason);
        },
        [checkRangeAllowed, notifyBlock, resolveProviderForArgs]
    );

    const onEventResize = useCallback(
        (args: any) => {
            const providerId = resolveProviderForArgs(args);
            const result = checkRangeAllowed(args.newStart, args.newEnd, providerId);
            args.allowed = result.allowed;
            if (!result.allowed) notifyBlock(result.reason);
        },
        [checkRangeAllowed, notifyBlock, resolveProviderForArgs]
    );

    const showOverlaySelector = (providers?.length ?? 0) > 0;

    return (
        <>
            <EventModal
                open={open}
                mode={mode}
                type={type}
                setType={setType}
                values={values}
                setValues={setValues}
                onSubmit={readOnly ? undefined : submit}
                onDelete={canDelete ? remove : undefined}
                onCancel={() => setOpen(false)}
                error={formError}
                resources={resources as CalendarResource[]}
                providers={providers as ProviderLite[]}
                onRefreshRequested={refreshEvents}
            />

            <div className="calendar-container w-full h-full flex flex-row overflow-hidden">
                <CalendarNavigatorPane
                    view={view as ViewMode}
                    visibleEvents={visibleEvents as UiEvent[]}
                    onDateChange={(d) => setStartDate(d)}
                />

                <div className="calendar-main flex flex-col flex-1 min-w-0">
                    <CalendarToolbar
                        view={view as ViewMode}
                        onSetView={(v) => setView(v)}
                        onToday={() => goToday()}
                        tzLabel={tzLabel}
                        showOverlaySelector={showOverlaySelector}
                        providers={providers}
                        overlayProviderId={overlayProviderId}
                        onOverlayChange={setOverlayProviderId}
                    />

                    <CalendarLegend />

                    <CalendarBody
                        view={view as ViewMode}
                        startDate={startDate}
                        resources={resources}
                        events={visibleEvents}
                        onTimeRangeSelected={onTimeRangeSelectedGuarded}
                        onTimeRangeSelecting={onTimeRangeSelecting}
                        onEventClick={onEventClick}
                        onEventMove={onEventMove}
                        onEventResize={onEventResize}
                        businessBeginsHour={businessBeginsHour}
                        businessEndsHour={businessEndsHour}
                    />
                </div>
            </div>
        </>
    );
};

export default Calendar;
