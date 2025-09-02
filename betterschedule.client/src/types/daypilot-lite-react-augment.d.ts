import * as React from "react";

/**
 * Type declarations for `@daypilot/daypilot-lite-react` with prop augmentation.
 * Provides named exports used in the app and extends Scheduler props.
 */
declare module "@daypilot/daypilot-lite-react" {
    /** Minimal shape for DayPilot.Date used in the app. */
    namespace DayPilot {
        class Date {
            constructor(value?: string | Date);
            toString(format?: string): string;
            toDate(): Date;
            static today(): Date;
        }
    }

    export { DayPilot };

    // ---------- Props -------------------

    export interface CalendarProps {
        viewType?: "Day" | "Week";
        theme?: string;
        startDate: any; // DayPilot.Date | string | Date
        events?: any[];
        durationBarVisible?: boolean;
        onTimeRangeSelected?: (args: any) => void;
        onEventClick?: (args: any) => void;
        onBeforeCellRender?: (args: any) => void;
        onBeforeEventRender?: (args: any) => void;
        onBeforeHeaderRender?: (args: any) => void;
        headerHeight?: number;
        controlRef?: (control: any) => void;
    }

    export interface MonthProps {
        startDate: any;
        theme?: string;
        events?: any[];
        eventBarVisible?: boolean;
        onTimeRangeSelected?: (args: any) => void;
        onEventClick?: (args: any) => void;
        onBeforeEventRender?: (args: any) => void;
        controlRef?: (control: any) => void;
    }

    export interface NavigatorProps {
        theme?: string;
        selectMode?: "Day" | "Week" | "Month";
        showMonths?: number;
        skipMonths?: number;
        onTimeRangeSelected?: (args: any) => void;
        events?: any[];
        controlRef?: (control: any) => void;
    }

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

        /** Before a Scheduler cell is rendered. */
        onBeforeCellRender?: (args: any) => void;

        /** Enables internal caching of `onBeforeCellRender` results. */
        beforeCellRenderCaching?: boolean;

        cellWidth?: number;
        headerHeight?: number;
        rowHeaderWidth?: number;
        durationBarVisible?: boolean;
        controlRef?: (control: any) => void;
    }

    // Some package versions expose a combined props/events type; mirror additions.
    export interface SchedulerPropsAndEvents extends SchedulerProps { }

    // ---------- Components (named exports) ----------

    export class DayPilotCalendar extends React.Component<CalendarProps> { }
    export class DayPilotMonth extends React.Component<MonthProps> { }
    export class DayPilotNavigator extends React.Component<NavigatorProps> { }
    export class DayPilotScheduler extends React.Component<SchedulerProps> { }
}