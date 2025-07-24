import { DayPilot } from "@daypilot/daypilot-lite-react";

// --- Base: Shared by most handlers
export interface DayPilotTimeRangeArgs {
    /** Start of selected time range (DayPilot.Date) */
    start: DayPilot.Date;
    /** End of selected time range (DayPilot.Date) */
    end: DayPilot.Date;
}

/** DayPilot control object (allows actions like clearSelection) */
export interface DayPilotControl {
    clearSelection: () => void;
}

// --- Calendar/Scheduler: time range selection (week/day/resource view)
export interface CalendarTimeRangeSelectedArgs extends DayPilotTimeRangeArgs {
    control: DayPilotControl;
    /** Resource id (may be number or string, depending on your data) */
    resource?: number | string;
}


export interface DayPilotEventArgs {
    e: {
        id: () => number | string;
        text: () => string;
        start: () => string;
        end: () => string;
        resource: () => number | string;
        backColor: string;
    };
}

