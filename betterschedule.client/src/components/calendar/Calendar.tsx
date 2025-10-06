import { useMemo } from "react";
import "@/styles/calendar";

import { useAuth } from "@/components/auth/AuthContext";
import CalendarNavigatorPane from "./CalendarNavigatorPane";
import CalendarToolbar from "./CalendarToolbar";
import CalendarLegend from "./CalendarLegend";
import CalendarBody from "./CalendarBody";
import EventModal from "@/components/modals/eventModals/EventModal";

import { useCalendarData } from "@/hooks/useCalendarData";
import { useAvailabilityOverlay } from "@/hooks/useAvailabilityOverlay";
import { useCalendarView } from "@/hooks/useCalendarView";
import { useEventModal } from "@/hooks/useEventModal";
import { filterEventsByCanceled, filterBlockedTimesForView } from "@/services/eventsService";

import { buildBusinessHours } from "@/services/availabilityService";
import { createBeforeCellRender, createBeforeSchedulerCellRender } from "@/adapters/daypilot/beforeCellRenderFactory";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";

import type { UiEvent, CalendarResource, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";
import type { ProviderLite } from "@/services/providersService";
import { peekClientName, getClientNameCached } from "@/services/clientNameCache";

/**
 * Root calendar shell coordinating data loading, overlays, rendering, and modal workflows.
 *
 * - WorkWeek: use DayPilot's native "WorkWeek" view type for weekly view without weekends.
 * - BusinessHours (Lite best practice): off-hours remain scrollable to avoid hit-testing drift.
 * - All Day/Week config changes flow into CalendarBody; explicit refresh via controlRef happens there.
 */
const Calendar = () => {
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    const { org, view, setView, startDate, setStartDate, tzLabel } = useCalendarView();
    const { resources, events, providers, refreshEvents, appointmentTypesById } = useCalendarData(startDate, view);
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
        onTimeRangeSelected,
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

    const visibleEvents = useMemo(() => {
        const base = filterEventsByCanceled(events, false);
        return filterBlockedTimesForView(base as UiEvent[], view as ViewMode, { userId, isManager });
    }, [events, view, userId, isManager]);

    const businessHours = useMemo(() => buildBusinessHours(org), [org]);

    const businessBeginsHour = useMemo<number>(() => {
        const s = businessHours?.startHHmm;
        const hh = s ? parseInt(s.slice(0, 2), 10) : 9;
        return Number.isFinite(hh) ? hh : 9;
    }, [businessHours]);

    const businessEndsHour = useMemo<number>(() => {
        const e = businessHours?.endHHmm;
        const hh = e ? parseInt(e.slice(0, 2), 10) : 17;
        return Number.isFinite(hh) ? hh : 17;
    }, [businessHours]);

    const beforeCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        return createBeforeCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager]);

    const beforeSchedulerCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        return createBeforeSchedulerCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager]);

    const beforeEventRender = useMemo(
        () =>
            createBeforeEventRender({
                getTypeLabel: (id?: number) => (typeof id === "number" ? appointmentTypesById.get(id) : undefined),
                getClientLabelSync: (id?: string) => (id ? peekClientName(id) : undefined),
                primeClient: (id: string) => getClientNameCached(id),
            }),
        [appointmentTypesById]
    );

    // Lite best practice: keep business hours visible by default; off-hours are reachable via scroll.
    const heightSpec: "Full" | "BusinessHours" = "BusinessHours";

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

            <div className="bs-calendar calendar-container w-full h-full flex flex-row overflow-hidden">
                <CalendarNavigatorPane
                    view={view as ViewMode}
                    visibleEvents={visibleEvents as UiEvent[]}
                    onDateChange={(d) => setStartDate(d)}
                />

                <div className="calendar-main flex flex-col flex-1 min-w-0">
                    <CalendarToolbar
                        view={view as ViewMode}
                        onSetView={(v) => setView(v)}
                        tzLabel={tzLabel}
                    />

                    {/* Legend with weekend toggle on the far right */}
                    <CalendarLegend view={view as ViewMode} onSetView={(v) => setView(v)} />

                    <CalendarBody
                        view={view as ViewMode}
                        startDate={startDate}
                        resources={resources}
                        events={visibleEvents}
                        onTimeRangeSelected={onTimeRangeSelected as (args: CalendarTimeRangeSelectedArgs) => void}
                        onEventClick={onEventClick}
                        beforeCellRender={beforeCellRender}
                        beforeSchedulerCellRender={beforeSchedulerCellRender}
                        beforeEventRender={beforeEventRender}
                        businessBeginsHour={businessBeginsHour}
                        businessEndsHour={businessEndsHour}
                        heightSpec={heightSpec}
                    />
                </div>
            </div>
        </>
    );
};

export default Calendar;
