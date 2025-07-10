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

// TODO: Maybe- pull weekday / date format from user locale settings
// TODO: add a "long" variant (e.g. "Mon, Jun 29 2025") for email templates
// TODO: accept a custom DayPilot.Date format string for more flexibility