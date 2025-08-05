import { getLocalDateString, getLocalTimeString } from "@/utilities/conversions";

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
