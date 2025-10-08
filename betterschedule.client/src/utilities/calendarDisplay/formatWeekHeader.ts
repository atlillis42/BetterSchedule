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
    const dpDate = toLocalDayPilotDate(date);

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

/**
 * Formats a single day label for the Resources view legend, e.g.:
 * "Wednesday, Oct 8th, 2025".
 *
 * @param date - DayPilot.Date or a value convertible to local date.
 * @returns Human-readable local date string with full weekday and ordinal day.
 *
 * @remarks
 * Uses DayPilot's local formatting to avoid UTC parsing drift. When given a
 * "YYYY-MM-DD" string, it is interpreted as a *local* date to avoid off-by-one.
 */
export function formatResourcesDayLabel(date: DayPilot.Date | string | Date): string {
    const dp = toLocalDayPilotDate(date);

    const weekday = dp.toString("dddd"); // e.g. "Wednesday"
    const mon = dp.toString("MMM");      // e.g. "Oct"
    const dayNum = Number(dp.toString("d"));
    const year = dp.toString("yyyy");

    return `${weekday}, ${mon} ${dayNum}${ordinal(dayNum)}, ${year}`;
}

/**
 * Converts various inputs to a DayPilot.Date that represents the same local day,
 * avoiding UTC parsing drift for plain "YYYY-MM-DD" strings.
 */
function toLocalDayPilotDate(value: DayPilot.Date | string | Date): DayPilot.Date {
    if (value instanceof DayPilot.Date) {
        return value;
    }
    if (typeof value === "string") {
        // Treat pure date strings as *local* to avoid UTC midnight shifts.
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            return new DayPilot.Date(d);
        }
        return new DayPilot.Date(value as never);
    }
    return new DayPilot.Date(value as never);
}

/** Returns the English ordinal suffix for a day number. */
function ordinal(n: number): "st" | "nd" | "rd" | "th" {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}
