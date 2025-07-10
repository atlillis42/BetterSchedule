// Central DayPilot Lite event handler arg types for BetterSchedule

import { DayPilot } from "@daypilot/daypilot-lite-react";

// --- Base: Shared by most handlers
export interface DayPilotTimeRangeArgs {
    start: DayPilot.Date;
    end: DayPilot.Date;
}

// --- Control: minimal interface for callback 'control' property
export interface DayPilotControl {
    clearSelection: () => void;
    // add more if used in your app
}

// --- Calendar/Scheduler: time range selection (week/day/resource view)
export interface CalendarTimeRangeSelectedArgs extends DayPilotTimeRangeArgs {
    control: DayPilotControl;
    resource?: number | string;
}

// --- Navigator: date select
export interface NavigatorTimeRangeSelectedArgs {
    day: DayPilot.Date;
    control: DayPilotControl;
}

// --- Calendar/Scheduler: event click
export interface CalendarEventClickArgs {
    e: {
        id: number | string;
        text: string;
        start: DayPilot.Date;
        end: DayPilot.Date;
        resource?: number | string;
        // more event properties can be added here
    };
    control: DayPilotControl;
}

// --- Calendar/Scheduler: before header render
export interface CalendarBeforeHeaderRenderArgs {
    header: {
        start: DayPilot.Date;
        end?: DayPilot.Date;
        html: string;
        // add other header fields if needed
    };
    control: DayPilotControl;
}
