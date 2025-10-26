import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns the first visible day to feed DayPilot for the given view.
 * Ensures Week and WorkWeek align on a Sunday-anchored week:
 * - Week: Sunday (firstDayOfWeek(0))
 * - WorkWeek: Monday inside that Sunday-anchored week (Sunday + 1)
 * - Day: the anchor day itself
 * - Month: DayPilot uses the month grid internally; pass the first of month
 * - Resources: keep as-is (1-day window usage)
 */
export function getStartDateForCalendar(
    view: "Day" | "Week" | "WorkWeek" | "Month" | "Resources",
    anchor: DayPilot.Date
): DayPilot.Date {
    switch (view) {
        case "Day":
            return anchor;
        case "Week":
            return anchor.firstDayOfWeek(0); // Sunday
        case "WorkWeek": {
            const sunday = anchor.firstDayOfWeek(0);
            return sunday.addDays(1); // Monday (upcoming when anchor is Sunday)
        }
        case "Month":
            return anchor.firstDayOfMonth();
        case "Resources":
            return anchor;
    }
}

/**
 * Computes the visible date range [start, end) used for event fetching.
 * Must stay consistent with getStartDateForCalendar() so UI and data align.
 */
export function getVisibleRange(
    anchor: DayPilot.Date,
    view: "Day" | "Week" | "WorkWeek" | "Month" | "Resources"
) {
    switch (view) {
        case "Day": {
            const start = anchor;
            return { start, end: start.addDays(1) };
        }
        case "Week": {
            const start = anchor.firstDayOfWeek(0); // Sunday
            return { start, end: start.addDays(7) };
        }
        case "WorkWeek": {
            // Sunday-anchored week; WorkWeek starts Monday (upcoming if anchor is Sunday)
            const start = anchor.firstDayOfWeek(0).addDays(1); // Monday
            return { start, end: start.addDays(5) };
        }
        case "Month": {
            const firstOfMonth = anchor.firstDayOfMonth();
            const gridStart = firstOfMonth.firstDayOfWeek(0); // Sunday grid start
            return { start: gridStart, end: gridStart.addDays(42) };
        }
        case "Resources": {
            const start = anchor;
            return { start, end: start.addDays(1) };
        }
    }
}
