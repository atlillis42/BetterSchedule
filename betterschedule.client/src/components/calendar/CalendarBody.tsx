import { useEffect, useRef } from "react";
import { DayPilot, DayPilotCalendar, DayPilotMonth } from "@daypilot/daypilot-lite-react";
import { formatWeekHeader } from "@/utilities/calendarDisplay/formatWeekHeader";
import { themeForView } from "@/domain/calendar/daypilotThemes";
import type { CalendarResource, UiEvent, CalendarTimeRangeSelectedArgs } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/**
 * CalendarBody
 * -----------------------------------------------------------------------------
 * Renders Day/Week/WorkWeek/Month/Resources using DayPilot Lite calendar components.
 *
 * Layout model:
 * - Day/Week/WorkWeek/Resources use {@link DayPilotCalendar} (time on rows).
 * - Month uses {@link DayPilotMonth}.
 * - Resources uses DayPilotCalendar in "resources mode" (horizontal columns = resources).
 *
 * UX/behaviors:
 * - Business hours and heightSpec are respected across Day/Week/Resources.
 * - Keys force remount on height/layout changes (avoids first-toggle no-op).
 * - Day view header: suppress "today" highlight (only one column is shown).
 * - Resources header: show default resource name, bolded via CSS (no swatches/tint).
 */
export default function CalendarBody(props: {
    /** Active high-level view selection. */
    view: ViewMode;
    /** Anchor date for the current view. */
    startDate: any;
    /** Events to render (already filtered for the active view). */
    events: UiEvent[];
    /** Schedulable resources; used in Resources view as columns. */
    resources: CalendarResource[];
    /** Fired when the user drag-selects a time range. */
    onTimeRangeSelected: (args: CalendarTimeRangeSelectedArgs) => void;
    /** Fired when the user clicks an event. */
    onEventClick: (args: any) => void;
    /** Cell render callback for Day/Week/Resources (Lite: mutate args.cell.properties). */
    beforeCellRender: (args: any) => void;
    /** Kept for compatibility with external code paths (no-op here). */
    beforeSchedulerCellRender: (args: any) => void;
    /** Event render callback (add classes, text, etc.). */
    beforeEventRender: (args: any) => void;
    /** Start of business hours (0–23). */
    businessBeginsHour?: number;
    /** End of business hours (0–23). */
    businessEndsHour?: number;
    /** Vertical height behavior for the time grid. */
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

    // Control refs allow explicit update() when layout-affecting props change.
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
    }, [view, businessBeginsHour, businessEndsHour, heightSpec, startDate]);

    // Helpers
    const appendClass = (existing: string | undefined, add?: string) =>
        add ? [existing, add].filter(Boolean).join(" ") : existing || "";

    // Keys to force remount when the vertical model changes
    const dayKey = `day-${heightSpec ?? "Full"}`;
    const weekKey = `week-${view}-${heightSpec ?? "Full"}`;
    const resourcesKey = `resources-${heightSpec ?? "Full"}`;

    // Resource columns (ids are strings to match event.resource normalization).
    type CalendarColumn = { id: string; name: string; backColor?: string };
    const columns: CalendarColumn[] = resources.map((r) => ({
        id: String(r.id),
        name: r.name,
        backColor: r.backColor, // TODO: Deprecate fully
    }));

    return (
        <div className="calendar-body flex-1 overflow-hidden min-h-0">
            {/* === DAY ============================================================= */}
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

            {/* === WEEK / WORKWEEK =============================================== */}
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

            {/* === MONTH ========================================================== */}
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

            {/* === RESOURCES (calendar resources mode) ============================ */}
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
