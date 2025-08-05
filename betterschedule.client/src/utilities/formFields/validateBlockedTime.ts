import { combineDateTime } from "@/utilities/conversions/dateParsing";

export function validateBlockedTime(values: any): string | null {
    if (!values.reason || !values.reason.trim()) return "Reason is required.";
    if (!values.resourceId || values.resourceId === "") return "Resource is required.";
    if (!values.startDate || !values.startTime) return "Start date and time are required.";
    if (!values.endDate || !values.endTime) return "End date and time are required.";

    const startCheck = combineDateTime(values.startDate, values.startTime);
    const endCheck = combineDateTime(values.endDate, values.endTime);

    if (!startCheck.iso) return startCheck.errorMsg || "Start date/time is invalid.";
    if (!endCheck.iso) return endCheck.errorMsg || "End date/time is invalid.";
    if (new Date(endCheck.iso) <= new Date(startCheck.iso)) return "End time must be after start time.";
    return null;
}