import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns strings used in the Day/Week header:
 *   - weekday → “Monday”, “Tuesday”, …
 *   - short   → “6/29/2025”
 *
 * @param date DayPilot.Date | string | Date
 */
export function formatWeekHeader(date: DayPilot.Date | string | Date) {
    // Ensure we always work with a DayPilot.Date instance
    const dpDate =
        date instanceof DayPilot.Date ? date : new DayPilot.Date(date as never);

    // Week-day name (e.g. Monday)
    const weekday = dpDate.toString("dddd");     
    // Short numeric form below it (mm/dd/yyyy)
    const short = dpDate.toString("M/d/yyyy");   

    return { weekday, short };
}

export function getVisibleRange(startDate: DayPilot.Date, view: "Day" | "Week" | "Month" | "Resources") {
    if (view === "Day") {
        return {
            start: startDate,
            end: startDate.addDays(1)
        };
    }
    if (view === "Week") {
        // Get the first day of this week (Sunday)
        const weekStart = startDate.firstDayOfWeek(0); // 0 = Sunday, 1 = Monday
        return {
            start: weekStart,
            end: weekStart.addDays(7)
        };
    }
    if (view === "Month") {
        // Start of calendar grid (could be previous Sunday, depending on Month settings)
        const firstOfMonth = startDate.firstDayOfMonth();

        // Optionally, go back to previous Sunday for a true grid start
        const gridStart = firstOfMonth.firstDayOfWeek(0);

        // Display 6 weeks (42 days) to cover full grid
        return {
            start: gridStart,
            end: gridStart.addDays(42)
        };
    }
    // Default fallback: just Day
    return {
        start: startDate,
        end: startDate.addDays(1)
    };
}
// TODO: Maybe- pull weekday / date format from user locale settings
// TODO: add a "long" variant (e.g. "Mon, Jun 29 2025") for email templates
// TODO: accept a custom DayPilot.Date format string for more flexibility