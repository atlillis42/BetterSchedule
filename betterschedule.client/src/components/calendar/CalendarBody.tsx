import { DayPilotCalendar, DayPilotMonth, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import type { CalendarResource, UiEvent, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/**
 * Main calendar body rendering Day/Week/Month/Resources views.
 * @public
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
    /** Optional: business-hours start (hour, local or org-local), applied to Day/Week. */
    businessBeginsHour?: number;
    /** Optional: business-hours end (hour, local or org-local), applied to Day/Week. */
    businessEndsHour?: number;
    /**
     * Optional height spec for Day/Week. Common values:
     * - "BusinessHoursNoScroll" (hide off-hours)
     * - "BusinessHours" (scrollable)
     * - "Full" (shows all no Scroll)
     */
    heightSpec?: string;
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
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    allowEventOverlap={false}
                    headerHeight={40}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    heightSpec={heightSpec}
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
                    onBeforeCellRender={beforeCellRender}
                    onBeforeEventRender={beforeEventRender}
                    allowEventOverlap={false}
                    headerHeight={40}
                    businessBeginsHour={businessBeginsHour}
                    businessEndsHour={businessEndsHour}
                    heightSpec={heightSpec}
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
