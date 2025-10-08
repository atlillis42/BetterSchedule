import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Computes the visible date range for the given calendar view.
 *
 * @remarks
 * Returns a half-open interval [start, end) as DayPilot.Date values.
 * - Day: the selected day.
 * - Week: Sun–Sat (7 days) based on `firstDayOfWeek(0)`.
 * - WorkWeek: Mon–Fri (5 days) based on `firstDayOfWeek(1)`.
 * - Month: full 6x7 grid (42 days) starting at the first grid Sunday.
 * - Resources: 5-day window to match the scheduler's `days={5}`.
 *
 * @param startDate - Anchor date within the target window.
 * @param view - The calendar view variant.
 * @returns Start (inclusive) and end (exclusive) boundaries as DayPilot.Date.
 */
export function getVisibleRange(
    startDate: DayPilot.Date,
    view: "Day" | "Week" | "WorkWeek" | "Month" | "Resources"
) {
    switch (view) {
        case "Day": {
            return { start: startDate, end: startDate.addDays(1) };
        }
        case "Week": {
            const weekStart = startDate.firstDayOfWeek(0); // Sunday
            return { start: weekStart, end: weekStart.addDays(7) };
        }
        case "WorkWeek": {
            const mon = startDate.firstDayOfWeek(1); // Monday
            return { start: mon, end: mon.addDays(5) };
        }
        case "Month": {
            const firstOfMonth = startDate.firstDayOfMonth();
            const gridStart = firstOfMonth.firstDayOfWeek(0); // Sunday grid start
            return { start: gridStart, end: gridStart.addDays(42) };
        }
        case "Resources": {
            return { start: startDate, end: startDate.addDays(1) };
        }
    }
}