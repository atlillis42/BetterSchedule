import { useEffect, useRef } from "react";
import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import { themeForView } from "@/domain/calendar/daypilotThemes";
import type { CalendarResource, UiEvent, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/**
 * Renders Day/Week/WorkWeek/Month/Resources using DayPilot Lite components.
 * - Weekends hidden in a weekly context use the native "WorkWeek" view type.
 * - Off-hours omission/scrolling is controlled by `heightSpec`.
 * - Uses controlRef + update() to refresh layout immediately on config changes.
 */
export default function CalendarBody(props: {
    view: ViewMode;
    startDate: any;
    events: UiEvent[];
    resources: CalendarResource[];
    onTimeRangeSelected: (args: CalendarTimeRangeSelectedArgs) => void;
    onEventClick: (args: any) => void;
    beforeCellRender: (args: any) => void;
    beforeSchedulerCellRender: (args: any) => void;
    beforeEventRender: (args: any) => void;
    /** Start of business hours (0–23). */
    businessBeginsHour?: number;
    /** End of business hours (0–23). */
    businessEndsHour?: number;
    /** Height/scroll behavior. */
    heightSpec?: "Full" | "BusinessHours" | "BusinessHoursNoScroll";
}) {
    const {
        view,
        startDate,
        events,
        resources,
        onTimeRangeSelected,
        onEventClick,
        beforeCellRender,
        beforeSchedulerCellRender,
        beforeEventRender,
        businessBeginsHour,
        businessEndsHour,
        heightSpec,
    } = props;

    const theme = themeForView(view);

    // Control refs for explicit updates.
    const dayRef = useRef<DayPilot.Calendar | null>(null);
    const weekRef = useRef<DayPilot.Calendar | null>(null);
    const monthRef = useRef<DayPilot.Month | null>(null);

    // Refresh the active control when layout-affecting props change.
    useEffect(() => {
        if (view === "Day" && dayRef.current) {
            dayRef.current.update();
        } else if ((view === "Week" || view === "WorkWeek") && weekRef.current) {
            weekRef.current.update();
        } else if (view === "Month" && monthRef.current) {
            monthRef.current.update();
        }
    }, [view, businessBeginsHour, businessEndsHour, heightSpec, startDate]);

    // Helper to append a CSS class safely.
    const appendClass = (existing: string | undefined, add?: string) =>
        add ? [existing, add].filter(Boolean).join(" ") : existing || "";

    return (
        <div className="calendar-body flex-1 overflow-auto">
            {view === "Day" && (
                <DayPilotCalendar
                    controlRef={(c) => (dayRef.current = c ?? null)}
                    viewType="Day"
                    theme={theme}
                    startDate={startDate}
                    events={events}
                    durationBarVisible={false}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    heightSpec={heightSpec}
                    onTimeRangeSelected={onTimeRangeSelected}
                    onEventClick={onEventClick}
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    headerHeight={40}
                    onBeforeHeaderRender={(args) => {
                        const info = formatWeekHeader(args.header.start);
                        args.header.html = info.html;
                        args.header.cssClass = appendClass(args.header.cssClass, info.cssClass);
                    }}
                />
            )}

            {(view === "Week" || view === "WorkWeek") && (
                <DayPilotCalendar
                    controlRef={(c) => (weekRef.current = c ?? null)}
                    // Native weekly variants: "Week" (7 days) or "WorkWeek" (Mon–Fri)
                    viewType={view === "WorkWeek" ? "WorkWeek" : "Week"}
                    theme={theme}
                    startDate={startDate}
                    events={events}
                    durationBarVisible={false}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    heightSpec={heightSpec}
                    onTimeRangeSelected={onTimeRangeSelected}
                    onEventClick={onEventClick}
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    headerHeight={40}
                    onBeforeHeaderRender={(args) => {
                        const info = formatWeekHeader(args.header.start);
                        args.header.html = info.html;
                        args.header.cssClass = appendClass(args.header.cssClass, info.cssClass);
                    }}
                />
            )}

            {view === "Month" && (
                <div className="month-wrapper">
                    <DayPilotMonth
                        controlRef={(c) => (monthRef.current = c ?? null)}
                        startDate={startDate}
                        theme={theme}
                        events={events}
                        eventBarVisible={false}
                        onTimeRangeSelected={onTimeRangeSelected}
                        onEventClick={onEventClick}
                        onBeforeEventRender={beforeEventRender}
                    />
                </div>
            )}

            {view === "Resources" && (
                <DayPilotScheduler
                    startDate={startDate}
                    days={5}
                    scale="Hour"
                    timeHeaders={[
                        { groupBy: "Day", format: "dddd MMM d" },
                        { groupBy: "Hour" },
                    ]}
                    resources={resources}
                    events={events}
                    onEventClick={onEventClick}
                    onBeforeEventRender={beforeEventRender}
                    onBeforeCellRender={beforeSchedulerCellRender}
                    cellWidth={50}
                    headerHeight={30}
                    rowHeaderWidth={150}
                    durationBarVisible={false}
                    theme={theme}
                />
            )}
        </div>
    );
}
