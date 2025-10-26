import { useMemo, useState, useEffect } from "react";
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

type EventStyle = "tinted" | "bar";

/**
 * Calendar shell composed of the navigator, toolbar, legend, and DayPilot body.
 * Uses a Sunday-anchored week model so that WorkWeek shows the upcoming Mon–Fri when the anchor is Sunday.
 *
 * Rendering window (DayPilot.startDate) = calendarStartDate from useCalendarView
 * Data window (fetch) = getVisibleRange(anchor=startDate, view)
 * => These are consistent by design via shared Sunday-anchored logic.
 */
const Calendar = () => {
    const { userId, isManager, isProvider } = useAuth();
    const canManageReservations = isManager || isProvider;
    const canManageBlocks = isManager || isProvider;

    // Note: calendarStartDate is the DayPilot-facing start, aligned with Week/WorkWeek rules.
    const { org, view, setView, startDate, setStartDate, tzLabel, calendarStartDate } = useCalendarView();

    // Fetch resources/events/providers for the visible window derived from anchor startDate + view.
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

    // Cell shading + event rendering
    const beforeCellRender = useMemo(() => createBeforeCellRender({ businessHours }), [businessHours]);
    const beforeSchedulerCellRender = useMemo(
        () => createBeforeSchedulerCellRender({ businessHours }),
        [businessHours]
    );
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

    // Use the DayPilot-facing start for header labels to avoid off-by-one-week headers.
    const resourcesDayLabel = useMemo(
        () => formatResourcesDayLabel(calendarStartDate as any),
        [calendarStartDate]
    );

    // Keep business hours visible by default; off-hours remain reachable via scroll.
    const heightSpec: "Full" | "BusinessHours" = "BusinessHours";

    // ---- Event style (tinted vs bar-only) ----
    const [eventStyle, setEventStyle] = useState<EventStyle>(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem("bs:eventStyle") : null;
        return saved === "bar" ? "bar" : "tinted";
    });
    useEffect(() => {
        try {
            localStorage.setItem("bs:eventStyle", eventStyle);
        } catch {
            // ignore
        }
    }, [eventStyle]);

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

            {/* Shell */}
            <div
                className={`
          bs-calendar calendar-container w-full h-full flex flex-row overflow-hidden
          bg-gradient-to-br from-slate-50 to-slate-100
          dark:from-slate-900 dark:to-slate-850
          ${eventStyle === "bar" ? "ev-style--bar" : ""}
        `}
            >
                <CalendarNavigatorPane
                    view={view as ViewMode}
                    visibleEvents={visibleEvents as UiEvent[]}
                    onDateChange={(d) => setStartDate(d)} // anchor change; calendarStartDate is derived
                />

                <div
                    className="
            calendar-main flex flex-col flex-1 min-w-0
            bg-white border-l border-slate-200
            dark:bg-slate-800 dark:border-slate-700
          "
                >
                    <CalendarToolbar view={view as ViewMode} onSetView={(v) => setView(v)} tzLabel={tzLabel} />

                    <CalendarLegend
                        view={view as ViewMode}
                        onSetView={(v) => setView(v)}
                        resourcesDayLabel={resourcesDayLabel}
                        eventStyle={eventStyle}
                        onToggleEventStyle={(next) => setEventStyle(next)}
                    />

                    <CalendarBody
                        view={view as ViewMode}
                        // IMPORTANT: render using the DayPilot-facing start date
                        startDate={calendarStartDate}
                        resources={resources}
                        events={visibleEvents}
                        onTimeRangeSelected={
                            onTimeRangeSelected as (args: CalendarTimeRangeSelectedArgs) => void
                        }
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
