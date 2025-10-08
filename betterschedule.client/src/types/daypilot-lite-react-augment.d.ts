import * as React from "react";

/**
 * Ambient augmentation for `@daypilot/daypilot-lite-react`.
 *
 * @remarks
 * Widens the public type surface used in BetterSchedule:
 * - Adds `"WorkWeek"` and `"Resources"` (and `"Days"`) to calendar viewType.
 * - Declares props we rely on: businessBeginsHour, businessEndsHour, heightSpec, days, columns.
 * - Types controlRef to expose `.update()` on underlying controls.
 */
declare module "@daypilot/daypilot-lite-react" {
    /**
     * Namespace representing minimal DayPilot runtime APIs used by the app.
     */
    namespace DayPilot {
        /**
         * Lightweight wrapper around dates used by DayPilot.
         *
         * Only a subset of the full API is declared—just the members the app touches.
         */
        class Date {
            /** Creates a new `DayPilot.Date`. */
            constructor(value?: string | Date);
            /** Formats to string using an optional DayPilot format token (e.g., "H", "yyyy-MM-dd"). */
            toString(format?: string): string;
            /** Converts to a native `Date`. */
            toDate(): Date;
            /** Returns a `DayPilot.Date` representing today (local). */
            static today(): Date;

            /** Day of week (0 = Sunday ... 6 = Saturday). Optional on some builds. */
            getDayOfWeek?(): number;
            /** Returns a new date offset by a number of days. Optional on some builds. */
            addDays?(days: number): Date;
        }

        /** Underlying Calendar control instance (we call `.update()`). */
        interface Calendar {
            update(): void;
        }

        /** Underlying Month control instance. */
        interface Month {
            update(): void;
        }

        /** Underlying Scheduler control instance (legacy, kept for completeness). */
        interface Scheduler {
            update(): void;
        }
    }

    /** Re-export for convenience. */
    export { DayPilot };

    // ---------- Props: Calendar ----------

    /**
     * Props for the `DayPilotCalendar` React component.
     *
     * @remarks
     * This subset reflects the surface the app currently uses.
     */
    export interface CalendarProps {
        /**
         * Calendar view variant.
         *
         * - `"Day"`: Single-day view.
         * - `"Week"`: Seven-day week.
         * - `"WorkWeek"`: Mon–Fri (weekends hidden).
         * - `"Days"`: Arbitrary day-range (see `days`).
         * - `"Resources"`: Resources as columns (time on rows).
         */
        viewType?: "Day" | "Week" | "WorkWeek" | "Days" | "Resources";

        /** Theme name applied to the DayPilot component. */
        theme?: string;

        /**
         * Start date of the rendered range.
         * Accepts `DayPilot.Date`, native `Date`, or an ISO-like `string`.
         */
        startDate: any;

        /** Event data array (library accepts flexible shapes). */
        events?: any[];

        /** When `true`, draws the duration bar inside events. */
        durationBarVisible?: boolean;

        /** Start of the business-hours window (0–23), local time. */
        businessBeginsHour?: number;

        /** End of the business-hours window (0–23), local time. */
        businessEndsHour?: number;

        /**
         * Vertical layout behavior for the time grid.
         * - `"BusinessHours"`: Business window is default viewport; off-hours reachable via scrollbar.
         * - `"BusinessHoursNoScroll"`: Off-hours not rendered.
         * - `"Full"`: Entire 24h.
         */
        heightSpec?: "Full" | "BusinessHours" | "BusinessHoursNoScroll";

        /**
         * Number of days when `viewType="Days"`. Not used by `"Week"`/`"WorkWeek"`.
         */
        days?: number;

        /**
         * Resource columns when `viewType="Resources"`.
         * @example [{ id: "12", name: "Room A" }]
         */
        columns?: Array<{ id: string | number; name: string; backColor?: string }>;

        /** Fired when a time range is selected (e.g., click-drag on empty cells). */
        onTimeRangeSelected?: (args: any) => void;

        /** Fired when an event is clicked. */
        onEventClick?: (args: any) => void;

        /** Allows styling/disabling a cell before render. */
        onBeforeCellRender?: (args: any) => void;

        /** Allows styling an event before render (e.g., bar color/title). */
        onBeforeEventRender?: (args: any) => void;

        /** Allows customizing the column header before render. */
        onBeforeHeaderRender?: (args: any) => void;

        /** Header height, in pixels. */
        headerHeight?: number;

        /**
         * Receives the underlying control instance.
         * The runtime passes `null` on unmount. The instance exposes `.update()`.
         */
        controlRef?: (control: DayPilot.Calendar | null) => void;
    }

    // ---------- Props: Month ----------

    /** Props for the `DayPilotMonth` React component. */
    export interface MonthProps {
        startDate: any;
        theme?: string;
        events?: any[];
        eventBarVisible?: boolean;
        showWeekend?: boolean;
        onTimeRangeSelected?: (args: any) => void;
        onEventClick?: (args: any) => void;
        onBeforeEventRender?: (args: any) => void;
        controlRef?: (control: DayPilot.Month | null) => void;
    }

    // ---------- Props: Navigator ----------

    export interface NavigatorProps {
        theme?: string;
        selectMode?: "Day" | "Week" | "Month";
        showMonths?: number;
        skipMonths?: number;
        onTimeRangeSelected?: (args: any) => void;
        events?: any[];
        controlRef?: (control: any) => void;
    }

    // ---------- Props: Scheduler (legacy, kept for completeness) ----------

    type TimeHeaderGroup =
        | { groupBy: "Day"; format?: string }
        | { groupBy: "Hour"; format?: string }
        | { groupBy: "Month"; format?: string }
        | { groupBy: "Cell"; format?: string };

    export interface SchedulerProps {
        startDate: any;
        days?: number;
        scale?: "Cell" | "Minute" | "Hour" | "Day";
        timeHeaders?: TimeHeaderGroup[];
        resources?: any[];
        events?: any[];
        onEventClick?: (args: any) => void;
        onBeforeEventRender?: (args: any) => void;
        onBeforeCellRender?: (args: any) => void;
        beforeCellRenderCaching?: boolean;
        cellWidth?: number;
        headerHeight?: number;
        heightSpec?: "Parent100Pct" | "Max100Pct" | "Max" | "Fixed" | "Auto";
        rowHeaderWidth?: number;
        durationBarVisible?: boolean;
        controlRef?: (control: DayPilot.Scheduler | null) => void;
        theme?: string;
    }

    export interface SchedulerPropsAndEvents extends SchedulerProps { }

    // ---------- Components (named exports) ----------

    export class DayPilotCalendar extends React.Component<CalendarProps> { }
    export class DayPilotMonth extends React.Component<MonthProps> { }
    export class DayPilotNavigator extends React.Component<NavigatorProps> { }
    export class DayPilotScheduler extends React.Component<SchedulerProps> { }
}
