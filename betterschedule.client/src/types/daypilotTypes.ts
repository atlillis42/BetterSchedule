import { DayPilot } from "@daypilot/daypilot-lite-react";

/** Shared range payload used by selection handlers. */
export interface DayPilotTimeRangeArgs {
    start: DayPilot.Date;
    end: DayPilot.Date;
}

/** Minimal control surface used by our selection logic. */
export interface DayPilotControl {
    clearSelection: () => void;
}

/**
 * Day/Week/Resources selection args.
 * `resource` is set in Resources mode when selecting inside a resource column.
 */
export interface CalendarTimeRangeSelectedArgs extends DayPilotTimeRangeArgs {
    control: DayPilotControl;
    resource?: number | string;
}

/** Value can be a primitive or a DayPilot getter function. */
type ValueOrGetter<T> = T | (() => T);

/** Minimal DayPilot event surface we use in callbacks (click, beforeRender, etc.). */
export interface DayPilotEventLike {
    id: ValueOrGetter<number | string>;
    text?: ValueOrGetter<string>;
    start?: ValueOrGetter<string>;
    end?: ValueOrGetter<string>;
    resource?: ValueOrGetter<number | string>;
    backColor?: string;
    data?: Record<string, unknown>;

    // Custom fields we attach
    type?: "reservation" | "blockedTime";
    createdByUserId?: string;
    createdByUserName?: string;
}

/** Event arg surface for DayPilot handlers. */
export interface DayPilotEventArgs {
    e: DayPilotEventLike;
}
