import { useEffect, useRef } from "react";
import { DayPilot, DayPilotCalendar, DayPilotMonth } from "@daypilot/daypilot-lite-react";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import { themeForView } from "@/domain/calendar/daypilotThemes";
import type { CalendarResource, UiEvent, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";

export default function CalendarBody(props: {
    /** Current view mode. */
    view: ViewMode;
    startDate: any;
    /** Events already filtered for visibility in the current view. */
    events: UiEvent[];
    /** Resource columns for Resources view (id/name/backColor). */
    resources: CalendarResource[];
    onTimeRangeSelected: (args: CalendarTimeRangeSelectedArgs) => void;
    onEventClick: (args: any) => void;
    /** Day/Week cell shading callback. */
    beforeCellRender: (args: any) => void;
    /** Scheduler-specific cell shading (kept for parity; may be used by Resources). */
    beforeSchedulerCellRender: (args: any) => void;
    /** Event rendering callback (labels, bars, etc.). */
    beforeEventRender: (args: any) => void;
    /** First business hour (e.g., 9). */
    businessBeginsHour?: number;
    /** Last business hour (e.g., 17). */
    businessEndsHour?: number;
    /** Height behavior for DayPilot. */
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
        beforeEventRender,
        businessBeginsHour,
        businessEndsHour,
        heightSpec,
    } = props;

    const theme = view === "Resources" ? themeForView("Day") : themeForView(view);

    const dayRef = useRef<DayPilot.Calendar | null>(null);
    const weekRef = useRef<DayPilot.Calendar | null>(null);
    const resourcesRef = useRef<DayPilot.Calendar | null>(null);
    const monthRef = useRef<DayPilot.Month | null>(null);

    useEffect(() => {
        if (view === "Day" && dayRef.current) {
            dayRef.current.update();
        } else if ((view === "Week" || view === "WorkWeek") && weekRef.current) {
            weekRef.current.update();
        } else if (view === "Resources" && resourcesRef.current) {
            resourcesRef.current.update();
        } else if (view === "Month" && monthRef.current) {
            monthRef.current.update();
        }
    }, [view, businessBeginsHour, businessEndsHour, heightSpec, startDate, events]);

    const appendClass = (existing: string | undefined, add?: string) =>
        add ? [existing, add].filter(Boolean).join(" ") : existing || "";

    const dayKey = `day-${heightSpec ?? "Full"}`;
    const weekKey = `week-${view}-${heightSpec ?? "Full"}`;
    const resourcesKey = `resources-${heightSpec ?? "Full"}`;

    type CalendarColumn = { id: string; name: string; backColor?: string };
    const columns: CalendarColumn[] = resources.map((r) => ({
        id: String(r.id),
        name: r.name,
        backColor: r.backColor,
    }));

    return (
        <div className="calendar-body flex-1 overflow-hidden min-h-0 bg-white dark:bg-slate-800">
            {/* DAY */}
            {view === "Day" && (
                <DayPilotCalendar
                    key={dayKey}
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
                    }}
                />
            )}

            {/* WEEK / WORKWEEK */}
            {(view === "Week" || view === "WorkWeek") && (
                <DayPilotCalendar
                    key={weekKey}
                    controlRef={(c) => (weekRef.current = c ?? null)}
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

            {/* MONTH */}
            {view === "Month" && (
                <div className="month-wrapper">
                    <DayPilotMonth
                        controlRef={(c) => (monthRef.current = c ?? null)}
                        startDate={startDate}
                        theme={theme}
                        events={events}
                        eventHeight={45}
                        eventBarVisible={false}
                        onTimeRangeSelected={onTimeRangeSelected}
                        onEventClick={onEventClick}
                        onBeforeEventRender={beforeEventRender}
                        headerHeight={40}
                    />
                </div>
            )}

            {/* RESOURCES */}
            {view === "Resources" && (
                <DayPilotCalendar
                    key={resourcesKey}
                    controlRef={(c) => (resourcesRef.current = c ?? null)}
                    viewType="Resources"
                    theme={theme}
                    startDate={startDate}
                    events={events}
                    columns={columns as any}
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
                        const col = (args as any)?.column;
                        if (!col) return;
                        args.header.cssClass = appendClass(args.header.cssClass, "bs-resource-colheader");
                    }}
                />
            )}
        </div>
    );
}
