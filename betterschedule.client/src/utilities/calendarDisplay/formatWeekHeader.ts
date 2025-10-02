import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns header display info and "today" metadata for Day/Week column headers.
 *
 * @param date - The header date (DayPilot.Date, ISO/string, or Date).
 * @returns Object with:
 *  - weekday: "Monday"
 *  - short: "6/29/2025"
 *  - isToday: true if the date is today (based on DayPilot.Date.today())
 *  - html: ready-to-use HTML snippet for the header cell
 *  - cssClass: "weekview_colheader_today" when isToday, otherwise undefined
 *
 * @remarks
 * Keeping the header HTML + "today" decision here centralizes the logic so
 * CalendarBody can remain a thin wiring layer. Visual styles are controlled
 * by CSS (e.g., `.weekview_colheader_today .weekview_colheader_inner { ... }`).
 */
export function formatWeekHeader(date: DayPilot.Date | string | Date) {
    const dpDate = date instanceof DayPilot.Date ? date : new DayPilot.Date(date as never);

    const weekday = dpDate.toString("dddd");
    const short = dpDate.toString("M/d/yyyy");
    const isToday = !!dpDate.getDatePart?.().equals?.(DayPilot.Date.today());

    const html = `
    <div style="display:flex;flex-direction:column;align-items:center;line-height:1.2">
      <span style="font-weight:600">${weekday}</span>
      <span style="font-size:12px">${short}</span>
    </div>`.trim();

    const cssClass = isToday ? "weekview_colheader_today" : undefined;

    return { weekday, short, isToday, html, cssClass };
}
