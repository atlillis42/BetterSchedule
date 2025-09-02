import { combineDateTime } from "@/utilities/conversions/dateParsing";

/**
 * Validates reservation form values.
 * @param values Raw reservation form values.
 * @returns A user-facing validation message, or `null` when valid.
 */
export function validateReservation(values: any): string | null {
    if (!values.clientId || !values.clientId.trim()) return "Client is required.";
    if (!values.serviceProviderId || !values.serviceProviderId.trim()) return "Service provider is required.";
    if (!values.appointmentTypeId || isNaN(Number(values.appointmentTypeId)) || Number(values.appointmentTypeId) <= 0) {
        return "Appointment type is required.";
    }
    if (!values.startDate || !values.startTime) return "Start date and time are required.";
    if (!values.endDate || !values.endTime) return "End date and time are required.";

    const startCheck = combineDateTime(values.startDate, values.startTime);
    const endCheck = combineDateTime(values.endDate, values.endTime);

    if (!startCheck.iso) return startCheck.errorMsg || "Start date/time is invalid.";
    if (!endCheck.iso) return endCheck.errorMsg || "End date/time is invalid.";
    if (new Date(endCheck.iso) <= new Date(startCheck.iso)) return "End time must be after start time.";
    return null;
}

/**
 * Validates blocked-time form values.
 * @param values Raw blocked-time form values.
 * @returns A user-facing validation message, or `null` when valid.
 */
export function validateBlockedTime(values: any): string | null {
    if (!values.reason || !values.reason.trim()) return "Reason is required.";
    if (!values.startDate || !values.startTime) return "Start date and time are required.";
    if (!values.endDate || !values.endTime) return "End date and time are required.";

    const startCheck = combineDateTime(values.startDate, values.startTime);
    const endCheck = combineDateTime(values.endDate, values.endTime);

    if (!startCheck.iso) return startCheck.errorMsg || "Start date/time is invalid.";
    if (!endCheck.iso) return endCheck.errorMsg || "End date/time is invalid.";
    if (new Date(endCheck.iso) <= new Date(startCheck.iso)) return "End time must be after start time.";
    return null;
}
