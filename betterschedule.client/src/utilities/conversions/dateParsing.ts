import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Formats a local calendar date (YYYY-MM-DD).
 * When given a DayPilot.Date, formats directly to avoid timezone shifts.
 */
export function getLocalDateString(
    value: DayPilot.Date | string | Date | { toDate?: () => Date }
): string {
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
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
        ).padStart(2, "0")}`
        : "";
}

/**
 * Formats a local time (HH:mm).
 * When given a DayPilot.Date, formats directly to avoid timezone shifts.
 */
export function getLocalTimeString(
    value: DayPilot.Date | string | Date | { toDate?: () => Date }
): string {
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
        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
            2,
            "0"
        )}`
        : "";
}

/**
 * Combines local date/time strings (YYYY-MM-DD + HH:mm) into a UTC ISO-8601 string.
 * Inputs are interpreted as local wall time; output is ISO in UTC (with 'Z').
 */
export function combineDateTime(
    dateStr: string,
    timeStr: string
): { iso: string | null; errorField?: string; errorMsg?: string } {
    const datePart = (dateStr || "").trim().slice(0, 10);
    const timePart = (timeStr || "").trim().slice(0, 5);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return { iso: null, errorField: "startDate", errorMsg: "Please select a valid date (YYYY-MM-DD)." };
    }
    if (!/^\d{2}:\d{2}$/.test(timePart)) {
        return { iso: null, errorField: "startTime", errorMsg: "Please select a valid time (HH:mm)." };
    }

    const localDateTimeString = `${datePart}T${timePart}:00`;
    const d = new Date(localDateTimeString);
    if (isNaN(d.getTime())) {
        return { iso: null, errorField: "startTime", errorMsg: "Invalid date or time combination." };
    }

    return { iso: d.toISOString() };
}

/** Converts MM/DD/YYYY to YYYY-MM-DD. */
export function toISODate(mdyyyy: string): string {
    const [month, day, year] = mdyyyy.split("/");
    if (!month || !day || !year) return "";
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Parses "hh:mm:ss" (or "mm:ss"/"h") to milliseconds. */
export function parseTimeSpanToMs(span: string): number {
    if (!span) return 0;
    const parts = span.split(":").map((n) => Number(n));
    if (parts.some(Number.isNaN)) return 0;

    let h = 0, m = 0, s = 0;
    if (parts.length === 3) {
        [h, m, s] = parts as [number, number, number];
    } else if (parts.length === 2) {
        [m, s] = parts as [number, number];
    } else {
        m = parts[0] ?? 0; // single-number form treated as minutes
    }

    return ((h * 60 + m) * 60 + s) * 1000;
}

/** Rounds a Date to the nearest/floor/ceil increment (minutes). */
export function roundToIncrement(
    d: Date,
    incrementMin = 15,
    mode: "round" | "floor" | "ceil" = "round"
): Date {
    const incMs = incrementMin * 60 * 1000;
    const t = d.getTime();
    const q = t / incMs;
    const snapped =
        mode === "ceil" ? Math.ceil(q) * incMs : mode === "floor" ? Math.floor(q) * incMs : Math.round(q) * incMs;
    const out = new Date(d);
    out.setTime(snapped);
    return out;
}

/**
 * Adds a duration ("hh:mm:ss") to local date+time and optionally snaps to a minute grid.
 * Returns local { date: "YYYY-MM-DD", time: "HH:mm" }.
 */
export function addDurationToLocal(
    dateStr: string,
    timeStr: string,
    duration: string,
    snapMin?: number,
    snapMode: "round" | "floor" | "ceil" = "round"
): { date: string; time: string } {
    const base = `${(dateStr || "").slice(0, 10)}T${(timeStr || "").slice(0, 5)}:00`;
    const start = new Date(base);
    if (Number.isNaN(start.getTime())) return { date: dateStr, time: timeStr };

    const end = new Date(start.getTime() + parseTimeSpanToMs(duration));
    const snapped = snapMin ? roundToIncrement(end, snapMin, snapMode) : end;

    const yyyy = snapped.getFullYear();
    const mm = String(snapped.getMonth() + 1).padStart(2, "0");
    const dd = String(snapped.getDate()).padStart(2, "0");
    const HH = String(snapped.getHours()).padStart(2, "0");
    const MM = String(snapped.getMinutes()).padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}` };
}
