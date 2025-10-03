import * as React from "react";

/**
 * Ambient augmentation for `@daypilot/daypilot-lite-react`.
 *
 * @remarks
 * This file widens the public type surface used in BetterSchedule:
 * - Adds `"WorkWeek"` (and `"Days"`) to `DayPilotCalendar.viewType`.
 * - Includes props we rely on: `businessBeginsHour`, `businessEndsHour`, `heightSpec`, `days`.
 * - Types `controlRef` to expose `.update()` on underlying controls.
 */
declare module "@daypilot/daypilot-lite-react" {
    /**
     * Namespace representing minimal DayPilot runtime APIs used by the app.
     */
    namespace DayPilot {
        /**
         * Lightweight wrapper around dates used by DayPilot.
         *
         * @remarks
         * Only a subset of the full API is declared—just the members the app touches.
         */
        class Date {
            /**
             * Creates a new `DayPilot.Date`.
             * @param value Optional source value (`string` or `Date`).
             */
            constructor(value?: string | Date);

            /**
             * Formats to string using an optional DayPilot format token.
             * @param format Optional format (e.g., `"H"`, `"yyyy-MM-dd"`).
             */
            toString(format?: string): string;

            /**
             * Converts to a native `Date`.
             */
            toDate(): Date;

            /**
             * Returns a `DayPilot.Date` representing today (local).
             */
            static today(): Date;

            /**
             * Returns the day of week (0 = Sunday ... 6 = Saturday).
             *
             * @remarks
             * Optional because not all versions expose it; used defensively.
             */
            getDayOfWeek?(): number;

            /**
             * Returns a new date offset by a number of days.
             *
             * @param days Positive/negative day delta.
             * @returns New `DayPilot.Date` instance.
             */
            addDays?(days: number): Date;
        }

        /**
         * Underlying Calendar control instance.
         *
         * @remarks
         * We call `.update()` via `controlRef` to refresh layout when props change.
         */
        interface Calendar {
            /** Re-renders the control and reapplies configuration. */
            update(): void;
        }

        /**
         * Underlying Month control instance.
         */
        interface Month {
            /** Re-renders the control and reapplies configuration. */
            update(): void;
        }

        /**
         * Underlying Scheduler control instance.
         */
        interface Scheduler {
            /** Re-renders the control and reapplies configuration. */
            update(): void;
        }
    }

    /** Re-export for convenience. */
    export { DayPilot };

    // ---------- Props -------------------

    /**
     * Props for the `DayPilotCalendar` React component.
     *
     * @remarks
     * This subset reflects only what the app currently uses.
     */
    export interface CalendarProps {
        /**
         * Calendar view variant.
         *
         * - `"Day"`: Single-day view.
         * - `"Week"`: Seven-day week.
         * - `"WorkWeek"`: Mon–Fri (weekends hidden).
         * - `"Days"`: Arbitrary day-range (see `days`).
         */
        viewType?: "Day" | "Week" | "WorkWeek" | "Days";

        /**
         * Theme name applied to the DayPilot component.
         */
        theme?: string;

        /**
         * Start date of the rendered range.
         *
         * @remarks
         * Accepts `DayPilot.Date`, native `Date`, or an ISO-like `string`.
         */
        startDate: any;

        /**
         * Event data array (library accepts flexible shapes).
         */
        events?: any[];

        /**
         * When `true`, draws the duration bar inside events.
         */
        durationBarVisible?: boolean;

        /**
         * Start of the business-hours window (0–23), local time.
         */
        businessBeginsHour?: number;

        /**
         * End of the business-hours window (0–23), local time.
         */
        businessEndsHour?: number;

        /**
         * Vertical layout behavior for the time grid.
         *
         * - `"BusinessHours"`: Business window is default viewport; off-hours are reachable via internal **scrollbar**.
         * - `"BusinessHoursNoScroll"`: Off-hours are **not rendered** (no vertical scrollbar).
         * - `"Full"`: Entire 24h height (rarely used in this app).
         */
        heightSpec?: "Full" | "BusinessHours" | "BusinessHoursNoScroll";

        /**
         * Number of days when `viewType="Days"`.
         *
         * @remarks
         * Not used for `"Week"` or `"WorkWeek"`.
         */
        days?: number;

        /**
         * Fired when a time range is selected (e.g., click-drag on empty cells).
         */
        onTimeRangeSelected?: (args: any) => void;

        /**
         * Fired when an event is clicked.
         */
        onEventClick?: (args: any) => void;

        /**
         * Allows styling/disabling a cell before render.
         *
         * @remarks
         * In DayPilot Lite, write to `args.cell.properties` for mutable styling.
         */
        onBeforeCellRender?: (args: any) => void;

        /**
         * Allows styling an event before render (e.g., bar color/title).
         */
        onBeforeEventRender?: (args: any) => void;

        /**
         * Allows customizing the column header before render.
         */
        onBeforeHeaderRender?: (args: any) => void;

        /**
         * Header height, in pixels.
         */
        headerHeight?: number;

        /**
         * Receives the underlying control instance.
         *
         * @remarks
         * The runtime passes `null` on unmount. The instance exposes `.update()`.
         */
        controlRef?: (control: DayPilot.Calendar | null) => void;
    }

    /**
     * Props for the `DayPilotMonth` React component.
     */
    export interface MonthProps {
        /**
         * Start date of the rendered month.
         *
         * @remarks
         * Accepts `DayPilot.Date`, native `Date`, or an ISO-like `string`.
         */
        startDate: any;

        /**
         * Theme name applied to the component.
         */
        theme?: string;

        /**
         * Event data array (library accepts flexible shapes).
         */
        events?: any[];

        /**
         * When `true`, suppresses the event bar.
         */
        eventBarVisible?: boolean;

        /**
         * Shows/hides weekend columns in Month view.
         */
        showWeekend?: boolean;

        /**
         * Fired when a time range is selected.
         */
        onTimeRangeSelected?: (args: any) => void;

        /**
         * Fired when an event is clicked.
         */
        onEventClick?: (args: any) => void;

        /**
         * Allows styling an event before render.
         */
        onBeforeEventRender?: (args: any) => void;

        /**
         * Receives the underlying Month control instance (supports `.update()`).
         */
        controlRef?: (control: DayPilot.Month | null) => void;
    }

    /**
     * Props for the `DayPilotNavigator` React component.
     */
    export interface NavigatorProps {
        /**
         * Theme name applied to the component.
         */
        theme?: string;

        /**
         * Selection mode for the navigator.
         */
        selectMode?: "Day" | "Week" | "Month";

        /**
         * Number of months to show at once.
         */
        showMonths?: number;

        /**
         * Month step when paging forward/backward.
         */
        skipMonths?: number;

        /**
         * Fired when a time range is selected in the navigator.
         */
        onTimeRangeSelected?: (args: any) => void;

        /**
         * Optional event data (used for highlighting).
         */
        events?: any[];

        /**
         * Receives the underlying control instance.
         */
        controlRef?: (control: any) => void;
    }

    /**
     * Time header group descriptors for `DayPilotScheduler`.
     */
    type TimeHeaderGroup =
        | { groupBy: "Day"; format?: string }
        | { groupBy: "Hour"; format?: string }
        | { groupBy: "Month"; format?: string }
        | { groupBy: "Cell"; format?: string };

    /**
     * Props for the `DayPilotScheduler` React component.
     */
    export interface SchedulerProps {
        /**
         * Start date of the scheduler timeline.
         */
        startDate: any;

        /**
         * Number of days in the timeline.
         */
        days?: number;

        /**
         * Timeline scale granularity.
         */
        scale?: "Cell" | "Minute" | "Hour" | "Day";

        /**
         * Header rows for the timeline (top to bottom).
         */
        timeHeaders?: TimeHeaderGroup[];

        /**
         * Resource rows.
         */
        resources?: any[];

        /**
         * Event data array (library accepts flexible shapes).
         */
        events?: any[];

        /**
         * Fired when an event is clicked.
         */
        onEventClick?: (args: any) => void;

        /**
         * Allows styling an event before render.
         */
        onBeforeEventRender?: (args: any) => void;

        /**
         * Allows styling/disabling a cell before render.
         */
        onBeforeCellRender?: (args: any) => void;

        /**
         * Enables internal caching for `onBeforeCellRender` results.
         */
        beforeCellRenderCaching?: boolean;

        /**
         * Cell width, in pixels.
         */
        cellWidth?: number;

        /**
         * Header height, in pixels.
         */
        headerHeight?: number;

        /**
         * Row header width, in pixels.
         */
        rowHeaderWidth?: number;

        /**
         * When `true`, draws the duration bar inside events.
         */
        durationBarVisible?: boolean;

        /**
         * Receives the underlying Scheduler control instance (supports `.update()`).
         */
        controlRef?: (control: DayPilot.Scheduler | null) => void;

        /**
         * Theme name applied to the component.
         */
        theme?: string;
    }

    /**
     * Some package versions expose a combined props/events type; mirror additions here.
     */
    export interface SchedulerPropsAndEvents extends SchedulerProps { }

    // ---------- Components (named exports) ----------

    /**
     * DayPilot Calendar React wrapper.
     */
    export class DayPilotCalendar extends React.Component<CalendarProps> { }

    /**
     * DayPilot Month React wrapper.
     */
    export class DayPilotMonth extends React.Component<MonthProps> { }

    /**
     * DayPilot Navigator React wrapper.
     */
    export class DayPilotNavigator extends React.Component<NavigatorProps> { }

    /**
     * DayPilot Scheduler React wrapper.
     */
    export class DayPilotScheduler extends React.Component<SchedulerProps> { }
}
