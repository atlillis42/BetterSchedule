import { useMemo } from "react";
import "@/styles/calendar";

import { useAuth } from "@/components/auth/auth-context";
import CalendarNavigatorPane from "./CalendarNavigatorPane";
import CalendarToolbar from "./CalendarToolbar";
import CalendarLegend from "./CalendarLegend";
import CalendarBody from "./CalendarBody";
import EventModal from "@/components/modals/eventModals/EventModal";

import { useCalendarData } from "@/hooks/useCalendarData";
import { useCalendarView } from "@/hooks/useCalendarView";
import { useEventModal } from "@/hooks/useEventModal";
import { filterEventsByDeleted, filterBlockedTimesForView } from "@/services/eventsService";

import { buildBusinessHours } from "@/services/businessHoursService";
import { createBeforeCellRender, createBeforeSchedulerCellRender } from "@/adapters/daypilot/beforeCellRenderFactory";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";

import type { UiEvent, CalendarResource, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";
import type { ProviderLite } from "@/services/providersService";
import { formatResourcesDayLabel } from "@/utilities/calendarDisplay/formatWeekHeader";
import { peekClientName, getClientNameCached } from "@/services/clientNameCache";

/**
 * Calendar (root shell)
 * -----------------------------------------------------------------------------
 * Orchestrates data, DayPilot view rendering, and modal workflows.
 *
 * Key behaviors:
 * - Resources view uses DayPilotCalendar(Resources) with a 1-day fetch window.
 * - Business hours default to "BusinessHours" (off-hours remain scrollable).
 * - Legend shows a compact date badge when in Resources view.
 * - Toolbar order: Day, Resources, Week, Month.
 */
const Calendar = () => {
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    const { org, view, setView, startDate, setStartDate, tzLabel } = useCalendarView();
    const { resources, events, providers, refreshEvents, appointmentTypesById } =
        useCalendarData(startDate, view);

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
        refreshEvents,
    });

    // Visible events after deleted/blocked filters for the current view.
    const visibleEvents = useMemo(() => {
        const base = filterEventsByDeleted(events, false);
        return filterBlockedTimesForView(base as UiEvent[], view as ViewMode, { userId, isManager });
    }, [events, view, userId, isManager]);

    // Organization business hours → DayPilot hour integers and shading helpers.
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

    // Cell shading: business-hours off-hours tint + odd-hour hint
    const beforeCellRender = useMemo(() => createBeforeCellRender({ businessHours }), [businessHours]);
    const beforeSchedulerCellRender = useMemo(
        () => createBeforeSchedulerCellRender({ businessHours }),
        [businessHours]
    );

    // Event rendering: include client label hooks via clientNameCache
    const beforeEventRender = useMemo(
        () =>
            createBeforeEventRender({
                getTypeLabel: (id?: number) =>
                    typeof id === "number" ? appointmentTypesById.get(id) : undefined,
                getClientLabelSync: (id?: string) => (id ? peekClientName(id) : undefined),
                primeClient: (id: string) => getClientNameCached(id),
            }),
        [appointmentTypesById]
    );

    /**
     * Day label shown in the legend when view === "Resources".
     * Delegates to a utility that ensures local interpretation and ordinal suffix.
     */
    const resourcesDayLabel = useMemo(() => formatResourcesDayLabel(startDate as any), [startDate]);

    // Keep business hours visible by default; off-hours remain reachable via scroll.
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
                    <CalendarToolbar view={view as ViewMode} onSetView={(v) => setView(v)} tzLabel={tzLabel} />

                    <CalendarLegend
                        view={view as ViewMode}
                        onSetView={(v) => setView(v)}
                        resourcesDayLabel={resourcesDayLabel}
                    />

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
