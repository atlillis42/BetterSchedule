import { DayPilotNavigator } from "@daypilot/daypilot-lite-react";
import { navigatorTheme } from "@/domain/calendar/daypilotThemes";
import type { UiEvent } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/**
 * Left-side date navigator pane for the calendar.
 */
export default function CalendarNavigatorPane(props: {
    view: ViewMode;
    visibleEvents: UiEvent[];
    onDateChange: (date: any) => void;
}) {
    const { view, visibleEvents, onDateChange } = props;

    return (
        <div className="calendar-sidebar w-64 bg-white shadow-md border-r border-gray-200">
            <DayPilotNavigator
                theme={navigatorTheme()}
                selectMode={view === "Month" ? "Month" : "Day"}
                showMonths={3}
                skipMonths={3}
                onTimeRangeSelected={(args) => onDateChange(args.day)}
                events={visibleEvents}
            />
        </div>
    );
}
