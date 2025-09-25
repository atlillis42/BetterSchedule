import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Formats a local calendar date (YYYY-MM-DD).
 * - When given a DayPilot.Date, formats directly from it to avoid timezone shifts.
 * - When given a string or Date, interprets it as *local* time and formats components.
 */
export function getLocalDateString(
    value: DayPilot.Date | string | Date | { toDate?: () => Date }
): string {
    // Prefer DayPilot.Date to avoid accidental TZ conversions
    if (value instanceof DayPilot.Date) {
        return value.toString("yyyy-MM-dd");
    }

    let d: Date | null = null;

    
    if (value && typeof (value as any).toDate === "function") {
        d = (value as any).toDate();
    } else if (typeof value === "string") {
        d = new Date(value);
    } else if (value instanceof Date) {
        d = value;
    }

    return d && !isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : "";
}

/**
 * Formats a local time (HH:mm).
 * - When given a DayPilot.Date, formats directly from it to avoid timezone shifts.
 * - When given a string or Date, interprets it as *local* time and formats components.
 */
export function getLocalTimeString(
    value: DayPilot.Date | string | Date | { toDate?: () => Date }
): string {
    // Prefer DayPilot.Date to avoid accidental TZ conversions
    if (value instanceof DayPilot.Date) {
        return value.toString("HH:mm");
    }

    let d: Date | null = null;

    if (value && typeof (value as any).toDate === "function") {
        d = (value as any).toDate();
    } else if (typeof value === "string") {
        d = new Date(value);
    } else if (value instanceof Date) {
        d = value;
    }

    return d && !isNaN(d.getTime())
        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : "";
}

/**
 * Combines *local* date and time strings (YYYY-MM-DD + HH:mm) into a UTC ISO-8601 string.
 * The input strings are interpreted as local wall time; the result is ISO in UTC (with 'Z').
 *
 * Returns: { iso: string | null, errorField?: string, errorMsg?: string }
 */
export function combineDateTime(
    dateStr: string,
    timeStr: string
): { iso: string | null; errorField?: string; errorMsg?: string } {
    const datePart = (dateStr || "").trim().slice(0, 10);
    const timePart = (timeStr || "").trim().slice(0, 5);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return {
            iso: null,
            errorField: "startDate",
            errorMsg: "Please select a valid date (YYYY-MM-DD).",
        };
    }
    if (!/^\d{2}:\d{2}$/.test(timePart)) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Please select a valid time (HH:mm).",
        };
    }

    // Construct a local Date and convert to UTC ISO string for transport/storage
    const localDateTimeString = `${datePart}T${timePart}:00`;
    const d = new Date(localDateTimeString);

    if (isNaN(d.getTime())) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Invalid date or time combination.",
        };
    }

    return { iso: d.toISOString() };
}

/** Converts MM/DD/YYYY to YYYY-MM-DD. */
export function toISODate(mdyyyy: string): string {
    const [month, day, year] = mdyyyy.split("/");
    if (!month || !day || !year) return "";
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}