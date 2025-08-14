import { DayPilot } from "@daypilot/daypilot-lite-react";

// Shared by selection handlers
export interface DayPilotTimeRangeArgs {
    start: DayPilot.Date;
    end: DayPilot.Date;
}

export interface DayPilotControl {
    clearSelection: () => void;
}

// Calendar/Scheduler selection (week/day/resource view)
export interface CalendarTimeRangeSelectedArgs extends DayPilotTimeRangeArgs {
    control: DayPilotControl;
    resource?: number | string;
}

// DayPilot can expose event fields as properties OR getters (e.id vs e.id()).
// This captures both without losing too much type safety.
type ValueOrGetter<T> = T | (() => T);

export interface DayPilotEventLike {
    id: ValueOrGetter<number | string>;
    text?: ValueOrGetter<string>;
    start?: ValueOrGetter<string>;
    end?: ValueOrGetter<string>;
    resource?: ValueOrGetter<number | string>;
    backColor?: string;
    data?: Record<string, unknown>;

    // Custom fields you attach to events
    type?: "reservation" | "blockedTime";
    createdByUserId?: string;
    createdByUserName?: string;
}

export interface DayPilotEventArgs {
    e: DayPilotEventLike;
}
