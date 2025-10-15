import { api } from "@auth/axios";

/**
 * Read/write accessors for organization settings.
 *
 * Notes:
 * - Business-hour fields are serialized as "HH:mm:ss".
 * - Booking windows are authoritative integers on the server.
 */

export type OrgSettingsDto = {
    /** Minimum lead time to create/reschedule, in minutes. */
    minLeadMinutes: number;
    /** Hours before start used to classify a client cancellation as "late". */
    cancelWindowHours: number;

    /** Business-hours start (local), "HH:mm:ss". */
    businessHoursStartLocal: string;
    /** Business-hours end (local), "HH:mm:ss". */
    businessHoursEndLocal: string;

    /** Require explicit confirmation when performing overrides. */
    requireConfirmOnOverrides: boolean;

    /** IANA time zone identifier. */
    timeZoneId: string;
    /** UI/formatting locale (e.g., "en-US"). */
    locale: string;

    /** Enable email notifications. */
    emailEnabled: boolean;
    /** Enable SMS notifications. */
    smsEnabled: boolean;
    /** Send confirmation after booking is created. */
    sendBookingConfirmation: boolean;
    /** Reminder offset in hours, or null for none. */
    reminderHoursBefore?: number | null;
};

/**
 * Update model accepted by PUT /org-settings.
 * Provide only the fields to change.
 */
export type UpdateOrgSettingsDto = Partial<{
    /** New minimum lead time, in minutes. */
    minLeadMinutes: number;
    /** New cancel window, in hours (used for late-cancel classification). */
    cancelWindowHours: number;

    /** Business-hours start (local), "HH:mm:ss". */
    businessHoursStartLocal: string;
    /** Business-hours end (local), "HH:mm:ss". */
    businessHoursEndLocal: string;

    /** Require explicit confirmation for overrides. */
    requireConfirmOnOverrides: boolean;

    /** IANA time zone identifier. */
    timeZoneId: string;
    /** UI/formatting locale (e.g., "en-US"). */
    locale: string;

    /** Enable email notifications. */
    emailEnabled: boolean;
    /** Enable SMS notifications. */
    smsEnabled: boolean;
    /** Send confirmation after booking creation. */
    sendBookingConfirmation: boolean;
    /** Reminder offset in hours, or null for none. */
    reminderHoursBefore: number | null;
}>;

/** Fetches the current organization's settings. */
export async function getOrgSettings(): Promise<OrgSettingsDto> {
    const { data } = await api.get<OrgSettingsDto>("/org-settings");
    return data;
}

/** Applies a partial update to the current organization's settings. */
export async function updateOrgSettings(payload: UpdateOrgSettingsDto): Promise<void> {
    await api.put("/org-settings", payload);
}
