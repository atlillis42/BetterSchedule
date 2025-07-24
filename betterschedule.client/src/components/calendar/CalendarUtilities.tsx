import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { ApiEvent, UiEvent, CalendarResource } from "@/types/calendarDataTypes";

// #region Calendar Header & View Helpers

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

export function getVisibleRange(
    startDate: DayPilot.Date,
    view: "Day" | "Week" | "Month" | "Resources"
) {
    if (view === "Day") {
        return { start: startDate, end: startDate.addDays(1) };
    }
    if (view === "Week") {
        // Week starts on Sunday. Change to (1) for Monday.
        const weekStart = startDate.firstDayOfWeek(0);
        return { start: weekStart, end: weekStart.addDays(7) };
    }
    if (view === "Month") {
        const firstOfMonth = startDate.firstDayOfMonth();
        const gridStart = firstOfMonth.firstDayOfWeek(0);
        return { start: gridStart, end: gridStart.addDays(42) };
    }
    return { start: startDate, end: startDate.addDays(1) };
}

// #endregion

// #region Time Option Utilities

export function generateTimeOptions() {
    const times = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, "0");
            const min = m.toString().padStart(2, "0");
            times.push(`${hour}:${min}`);
        }
    }
    return times;
}

// #endregion

// #region Modal Form Builder

export interface EventModalFieldOptions {
    resources: CalendarResource[];
    values?: {
        text?: string;
        startDate?: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;
        resourceId?: number | string;
        delete?: boolean;
        formError?: string;
    };
    includeDelete?: boolean;
}

/**
 * Builds a consistent modal field schema for create/edit event.
 * Pass in prefilled values for editing, or blank/defaults for create.
 */
export function eventModalFields({
    resources,
    values = {},
    includeDelete = false
}: EventModalFieldOptions) {
    const TIME_OPTIONS = generateTimeOptions();

    const fields = [
        ...(values.formError
            ? [{
                name: "",
                id: "formError",
                type: "note",
                html: `<div style="color: red; font-weight: bold; margin-bottom: 8px;">${values.formError}</div>`
            }]
            : []),
        { name: "Event Name", id: "text", type: "text", value: values.text ?? "" },
        { name: "Start Date", id: "startDate", type: "date", value: values.startDate ?? "" },
        { name: "Start Time", id: "startTime", type: "select", options: TIME_OPTIONS.map(t => ({ name: t, id: t })), value: values.startTime ?? "" },
        { name: "End Date", id: "endDate", type: "date", value: values.endDate ?? "" },
        { name: "End Time", id: "endTime", type: "select", options: TIME_OPTIONS.map(t => ({ name: t, id: t })), value: values.endTime ?? "" },
        {
            name: "Resource",
            id: "resourceId",
            type: "select",
            options: [{ name: "(None)", id: "" }, ...resources.map(r => ({ name: r.name, id: r.id }))],
            value: values.resourceId ?? ""
        },
        ...(includeDelete ? [
            { name: "Delete Event", id: "delete", type: "checkbox", value: !!values.delete }
        ] : [])
    ];
    return fields;
}

// #endregion

// #region Date/Time Parsing & Formatting

export function getLocalDateString(dateLike: string | Date | { toDate?: () => Date }): string {
    let d: Date | null = null;
    if (dateLike && typeof (dateLike as any).toDate === "function") {
        d = (dateLike as any).toDate();
    } else if (typeof dateLike === "string") {
        d = new Date(dateLike);
    } else if (dateLike instanceof Date) {
        d = dateLike;
    }
    return d && !isNaN(d.getTime())
        ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, "0") + '-' +
        String(d.getDate()).padStart(2, "0")
        : "";
}

export function getLocalTimeString(dateLike: string | Date | { toDate?: () => Date }): string {
    let d: Date | null = null;
    if (dateLike && typeof (dateLike as any).toDate === "function") {
        d = (dateLike as any).toDate();
    } else if (typeof dateLike === "string") {
        d = new Date(dateLike);
    } else if (dateLike instanceof Date) {
        d = dateLike;
    }
    return d && !isNaN(d.getTime())
        ? String(d.getHours()).padStart(2, "0") + ':' +
        String(d.getMinutes()).padStart(2, "0")
        : "";
}

/**
 * Extracts universal event fields from any event object:
 * Supports DayPilot.Event, DayPilot event data, Google, Outlook, custom, etc.
 */
export function extractEventFields(event: any): {
    id: number | string;
    text: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    resourceId?: number | string;
    backColor?: string;
} {
    // Helper to safely get a string from various input types
    function toStringSafe(val: any): string {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (val instanceof Date) return val.toISOString();
        if (val.toString && typeof val.toString === "function") return val.toString();
        return "";
    }

    // ID
    let id =
        (typeof event.id === "function" ? event.id() : undefined)
        ?? event?.data?.id
        ?? event?.id
        ?? event?.eventId // e.g. for Google/Outlook
        ?? undefined;
    if (id === undefined || id === null || id === "") {
        throw new Error("Event object missing required 'id'.");
    }

    // Text/title/summary
    let text =
        (typeof event.text === "function" ? event.text() : undefined)
        ?? event?.data?.text
        ?? event?.summary    // Google
        ?? event?.title      // Outlook/others
        ?? event?.text
        ?? "";

    // Resource
    let resourceId =
        (typeof event.resource === "function" ? event.resource() : undefined)
        ?? event?.data?.resource
        ?? event?.resourceId
        ?? event?.resource
        ?? "";

    // Back color
    let backColor =
        (event?.data?.backColor ?? event?.backColor ?? event?.colorId ?? undefined);

    // Start/end (prefer DayPilot.Event getter if available)
    let startRaw = "";
    let endRaw = "";

    if (event && typeof event.start === "function") startRaw = toStringSafe(event.start());
    if (!startRaw && event?.data?.start) startRaw = toStringSafe(event.data.start);
    if (!startRaw && event?.start) startRaw = toStringSafe(event.start);
    if (!startRaw && event?.startTime) startRaw = toStringSafe(event.startTime); // e.g. Google

    if (event && typeof event.end === "function") endRaw = toStringSafe(event.end());
    if (!endRaw && event?.data?.end) endRaw = toStringSafe(event.data.end);
    if (!endRaw && event?.end) endRaw = toStringSafe(event.end);
    if (!endRaw && event?.endTime) endRaw = toStringSafe(event.endTime);

    const startDate = startRaw ? getLocalDateString(startRaw) : "";
    const startTime = startRaw ? getLocalTimeString(startRaw) : "";
    const endDate = endRaw ? getLocalDateString(endRaw) : "";
    const endTime = endRaw ? getLocalTimeString(endRaw) : "";

    return { id, text, startDate, startTime, endDate, endTime, resourceId, backColor };
}

/**
 * Extracts "HH:mm" from a string or Date.
 */

/**
 * Convert an ISO-8601 string that’s in **UTC** (has “Z” or +00:00)
 * into a DayPilot.Date that holds the *same wall-clock* time.
 *
 * Example: "2025-07-24T14:00:00Z"  →  2 PM shown in the calendar,
 * not 2 PM+offset.
 */
export function utcIsoToDayPilotLocal(utcIso: string): DayPilot.Date {
    return new DayPilot.Date(new Date(utcIso), /*isLocal=*/true);
}

export function toUiEvent(api: ApiEvent): UiEvent {
    return {
        id: api.id,
        text: api.text,
        start: utcIsoToDayPilotLocal(api.startUtc),
        end: utcIsoToDayPilotLocal(api.endUtc),
        resource: api.resourceId,
        backColor: api.backColor,
    };
}

export function extractTime(val: string | Date) {
    if (typeof val === "string") {
        return val.slice(11, 16);
    }
    if (val instanceof Date) {
        return val.toISOString().slice(11, 16);
    }
    return "";
}

/**
 * Combines local date and time strings into an ISO8601 UTC string.
 * Assumes input is always in user's local time.
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
            errorMsg: "Please select a valid date (YYYY-MM-DD)."
        };
    }
    if (!/^\d{2}:\d{2}$/.test(timePart)) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Please select a valid time (HH:mm)."
        };
    }

    const localDateTimeString = `${datePart}T${timePart}:00`;

    const d = new Date(localDateTimeString);

    if (isNaN(d.getTime())) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Invalid date or time combination."
        };
    }

    return { iso: d.toISOString() };
}
/**
 * Converts M/D/YYYY or MM/DD/YYYY to ISO "YYYY-MM-DD".
 */
export function toISODate(mdyyyy: string): string {
    const [month, day, year] = mdyyyy.split("/");
    if (!month || !day || !year) return "";
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Gets "YYYY-MM-DD" from Date, string, or DayPilot.Date.
 */
export function getBaseDate(val: any): string {
    if (!val) return "";
    if (typeof val === "string") {
        // Defensive: avoid 'Invalid Date' strings
        if (val.startsWith("Invalid Date")) return "";
        return val.slice(0, 10);
    }
    // DayPilot.Date object or similar
    if (val.toString && typeof val.toString === "function") {
        const str = val.toString();
        if (str.startsWith("Invalid Date")) return "";
        return str.slice(0, 10);
    }
    // Native Date object
    if (val instanceof Date) {
        const str = val.toISOString();
        if (str.startsWith("Invalid Date")) return "";
        return str.slice(0, 10);
    }
    return "";
}

/**
 * Converts backend API date/time string to JS Date.
 */
export function parseApiDate(apiDateStr: string): Date {
    return new Date(apiDateStr);
}

/**
 * Formats date for display in user's local time.
 */
export function formatLocalDateTime(date: Date): string {
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

/**
 * Converts local Date to API string (ISO8601, Z/UTC).
 */
export function toApiDateString(localDate: Date): string {
    return localDate.toISOString(); // includes Z for UTC
}

/**
 * Builds an event DTO (for create/update) from a universal event object and modal values.
 * Handles DayPilot.Event, external, or internal event formats.
 */
export function buildEventApiDto({
    baseEvent,
    formValues,
}: {
    baseEvent: any;
    formValues: {
        text: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        resourceId?: number | string | null;
        backColor?: string;
    };
}) {
    // Always combine date+time fields to full ISO8601 with Z
    // Defensive: Pass through combineDateTime for both start and end
    const startCheck = combineDateTime(formValues.startDate, formValues.startTime);
    const endCheck = combineDateTime(formValues.endDate, formValues.endTime);

    if (!startCheck.iso || !endCheck.iso) {
        throw new Error("Invalid start or end date/time.");
    }

    // Prefer modal color, then event color
    let backColor =
        formValues.backColor ??
        baseEvent?.backColor ??
        baseEvent?.data?.backColor ??
        undefined;

    // Prefer modal resource, then event resource
    let resourceId =
        formValues.resourceId ??
        baseEvent?.resourceId ??
        baseEvent?.resource ??
        baseEvent?.data?.resource ??
        undefined;

    // Prefer modal text, then event text
    let text =
        formValues.text ??
        baseEvent?.text ??
        baseEvent?.data?.text ??
        "";

    return {
        text,
        startUtc: startCheck.iso,
        endUtc: endCheck.iso,
        resourceId: resourceId === "" || resourceId === null ? undefined : Number(resourceId),
        backColor,
    };
}

// #endregion

// #region TODOs/Planned

// TODO: add a "long" variant (e.g. "Mon, Jun 29 2025") for email templates

// #endregion
