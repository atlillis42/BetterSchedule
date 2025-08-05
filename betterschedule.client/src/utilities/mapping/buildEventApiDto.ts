import { combineDateTime } from "@/utilities/conversions";

/**
 * Builds an event DTO for backend from modal values and event.
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
    // Defensive: combineDateTime for both start and end
    const startCheck = combineDateTime(formValues.startDate, formValues.startTime);
    const endCheck = combineDateTime(formValues.endDate, formValues.endTime);

    if (!startCheck.iso || !endCheck.iso) {
        throw new Error("Invalid start or end date/time.");
    }

    const backColor =
        formValues.backColor ??
        baseEvent?.backColor ??
        baseEvent?.data?.backColor ??
        undefined;

    const resourceId =
        formValues.resourceId ??
        baseEvent?.resourceId ??
        baseEvent?.resource ??
        baseEvent?.data?.resource ??
        undefined;

    const text =
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

