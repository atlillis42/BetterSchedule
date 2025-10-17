import { getLocalDateString, getLocalTimeString } from "@/utilities/conversions";

/**
 * Extracts common fields from a DayPilot event (or a plain event-like object).
 * Supports:
 * - DayPilot.Event API (functions: id(), text(), start(), end(), resource())
 * - DayPilot data objects (event.data.*)
 * - Plain objects with { id, text, start, end, resourceId/resource, backColor }
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
    const callIfFn = (v: any) => (typeof v === "function" ? v() : v);

    // Id
    const id =
        callIfFn(event?.id) ??
        event?.data?.id ??
        event?.id ??
        undefined;
    if (id === undefined || id === null || id === "") {
        throw new Error("Event object missing required 'id'.");
    }

    // Text
    const text =
        callIfFn(event?.text) ??
        event?.data?.text ??
        event?.text ??
        "";

    // Resource
    const resourceRaw =
        callIfFn(event?.resource) ??
        event?.data?.resource ??
        event?.resourceId ??
        event?.resource ??
        undefined;

    // Back color (optional)
    const backColor =
        event?.data?.backColor ??
        event?.backColor ??
        undefined;

    // Start/End
    const startRaw =
        callIfFn(event?.start) ??
        event?.data?.start ??
        event?.start ??
        undefined;

    const endRaw =
        callIfFn(event?.end) ??
        event?.data?.end ??
        event?.end ??
        undefined;

    const startDate = startRaw ? getLocalDateString(startRaw) : "";
    const startTime = startRaw ? getLocalTimeString(startRaw) : "";
    const endDate = endRaw ? getLocalDateString(endRaw) : "";
    const endTime = endRaw ? getLocalTimeString(endRaw) : "";

    return {
        id,
        text,
        startDate,
        startTime,
        endDate,
        endTime,
        resourceId: resourceRaw,
        backColor,
    };
}
