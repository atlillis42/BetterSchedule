import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns the visible date range (start, end) for Day/Week/Month/Resource views.
 * All returned values are DayPilot.Date for consistency.
 */
export function getVisibleRange(
    startDate: DayPilot.Date,
    view: "Day" | "Week" | "Month" | "Resources"
) {
    if (view === "Day") {
        return { start: startDate, end: startDate.addDays(1) };
    }
    if (view === "Week") {
        // Week starts on Sunday (0); change to (1) for Monday if preferred.
        const weekStart = startDate.firstDayOfWeek(0);
        return { start: weekStart, end: weekStart.addDays(7) };
    }
    if (view === "Month") {
        const firstOfMonth = startDate.firstDayOfMonth();
        const gridStart = firstOfMonth.firstDayOfWeek(0);
        // Show full 6x7=42 days to fill grid (common in calendar UIs)
        return { start: gridStart, end: gridStart.addDays(42) };
    }
    // Default for Resources or unknown: single day
    return { start: startDate, end: startDate.addDays(1) };
}
