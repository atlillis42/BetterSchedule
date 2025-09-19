import { DayPilotCalendar, DayPilotMonth, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import type { CalendarResource, UiEvent, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/**
 * Renders Day/Week/Month/Resources views using DayPilot components.
 * Supports gating callbacks for selection/move/resize and optional business-hours clamping.
 *
 * @public
 */
export default function CalendarBody(props: {
    view: ViewMode;
    startDate: any;
    events: UiEvent[];
    resources: CalendarResource[];
    onTimeRangeSelected: (args: CalendarTimeRangeSelectedArgs) => void;
    onTimeRangeSelecting?: (args: any) => void;
    onEventClick: (args: any) => void;
    onEventMove?: (args: any) => void;
    onEventResize?: (args: any) => void;
    /** Optional (unused when avoiding shading). */
    beforeCellRender?: (args: any) => void;
    /** Optional (unused when avoiding shading). */
    beforeSchedulerCellRender?: (args: any) => void;
    /** Optional: event decoration hook. */
    beforeEventRender?: (args: any) => void;
    /** Optional: business-hours start hour (0..23). */
    businessBeginsHour?: number;
    /** Optional: business-hours end hour (1..24). */
    businessEndsHour?: number;
    /**
     * Optional height spec for Day/Week. Common values:
     * - "BusinessHoursNoScroll" (hide off-hours)
     * - "BusinessHours" (scrollable)
     * - "Full" (shows all, no scroll)
     */
}) {
    const {
        view,
        startDate,
        events,
        resources,
        onTimeRangeSelected,
        onTimeRangeSelecting,
        onEventClick,
        onEventMove,
        onEventResize,
        beforeCellRender,
        beforeSchedulerCellRender,
        beforeEventRender,
        businessBeginsHour,
        businessEndsHour,
    } = props;

    return (
        <div className="calendar-body flex-1 overflow-auto">
            {view === "Day" && (
                <DayPilotCalendar
                    viewType="Day"
                    theme="betterschedule"
                    startDate={startDate}
                    events={events}
                    durationBarVisible={false}
                    onTimeRangeSelected={onTimeRangeSelected}
                    onEventClick={onEventClick}
                    onEventMove={onEventMove}
                    onEventResize={onEventResize}
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    allowEventOverlap={false}
                    headerHeight={40}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    onBeforeHeaderRender={(args) => {
                        const { weekday, short } = formatWeekHeader(args.header.start);
                        args.header.html = `
              <div style="display:flex;flex-direction:column;align-items:center;line-height:1.2">
                <span style="font-weight:600">${weekday}</span>
                <span style="font-size:12px">${short}</span>
              </div>`;
                    }}
                />
            )}

            {view === "Week" && (
                <DayPilotCalendar
                    viewType="Week"
                    theme="betterschedule"
                    startDate={startDate}
                    events={events}
                    durationBarVisible={false}
                    onTimeRangeSelected={onTimeRangeSelected}
                    onEventClick={onEventClick}
                    onEventMove={onEventMove}
                    onEventResize={onEventResize}
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    allowEventOverlap={false}
                    headerHeight={40}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    onBeforeHeaderRender={(args) => {
                        const { weekday, short } = formatWeekHeader(args.header.start);
                        args.header.html = `
              <div style="display:flex;flex-direction:column;align-items:center;line-height:1.2">
                <span style="font-weight:600">${weekday}</span>
                <span style="font-size:12px">${short}</span>
              </div>`;
                    }}
                />
            )}

            {view === "Month" && (
                <div className="month-wrapper">
                    <DayPilotMonth
                        startDate={startDate}
                        theme="monthlybetterschedule"
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
                    onTimeRangeSelected={onTimeRangeSelected}
                    onTimeRangeSelecting={onTimeRangeSelecting}
                    onEventMove={onEventMove}
                    onEventResize={onEventResize}
                    allowEventOverlap={false}
                    cellWidth={50}
                    headerHeight={30}
                    rowHeaderWidth={150}
                    durationBarVisible={false}
                />
            )}
        </div>
    );
}
