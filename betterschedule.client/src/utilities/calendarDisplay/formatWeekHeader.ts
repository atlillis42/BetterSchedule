import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns readable header info for calendar columns.
 * - weekday: "Monday"
 * - short:   "6/29/2025"
 */
export function formatWeekHeader(date: DayPilot.Date | string | Date) {
    const dpDate =
        date instanceof DayPilot.Date ? date : new DayPilot.Date(date as never);

    const weekday = dpDate.toString("dddd");
    const short = dpDate.toString("M/d/yyyy");

    return { weekday, short };
}
