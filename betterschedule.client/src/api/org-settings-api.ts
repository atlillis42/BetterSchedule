import { api } from "@auth/axios";

/**
 * Read/write accessors for organization settings.
 * String enums mirror the server's enum names for compatibility.
 *
 * Notes:
 * - Business-hour fields are serialized as "HH:mm:ss".
 * - Booking windows are authoritative integers on the server.
 */

/** Calendar view options as exposed by the API. */
export type DefaultCalendarView = "Day" | "Week" | "WorkWeek" | "Month" | "Resources";

/** Calendar background shading mode. */
export type CalendarShadingMode = "None" | "OrgBusinessHours" | "ProviderAvailability";

/** Server-side availability enforcement level. */
export type AvailabilityEnforcement =
    | "None"
    | "Warn"
    | "BlockProvidersWarnManagers"
    | "BlockAllRequireOverride";

/** Provider cancel policy (server enum). */
export type ProviderCancelPolicy = "AnyTime" | "RespectWindow" | "None";

/** Client cancel policy (server enum). */
export type ClientCancelPolicy = "AnyTime" | "RespectWindow" | "None";

/**
 * Read model returned by GET /org-settings.
 * Mirrors OrgSettingsDto on the server.
 */
export type OrgSettingsDto = {
    /** Minimum lead time to create/reschedule, in minutes. */
    minLeadMinutes: number;
    /** Hours before start after which modify/cancel requires override. */
    cancelWindowHours: number;

    /** Provider self-cancel policy. */
    providerCancelPolicy: ProviderCancelPolicy;
    /** Client self-cancel policy. */
    clientCancelPolicy: ClientCancelPolicy;

    /** Whether weekend columns are shown by default. */
    showWeekends: boolean;
    /** First day of week for week/month views: 0..6 (0=Sunday). */
    startOfWeek: number;
    /** Business-hours start (local), "HH:mm:ss". */
    businessHoursStartLocal: string;
    /** Business-hours end (local), "HH:mm:ss". */
    businessHoursEndLocal: string;
    /** Default calendar view. */
    defaultView: DefaultCalendarView;

    /** Calendar background shading mode. */
    shadingMode: CalendarShadingMode;
    /** Server-side availability enforcement level. */
    availabilityEnforcement: AvailabilityEnforcement;
    /** Require explicit confirmation when performing overrides. */
    requireConfirmOnOverrides: boolean;
    /** Whether provider availability is visible to all roles. */
    availabilityPublic: boolean;
    /** Whether providers can edit their own availability. */
    providersCanEditOwnAvailability: boolean;

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
    /** New cancel/modify window, in hours. */
    cancelWindowHours: number;

    /** New provider cancel policy. */
    providerCancelPolicy: ProviderCancelPolicy;
    /** New client cancel policy. */
    clientCancelPolicy: ClientCancelPolicy;

    /** Toggle weekends. */
    showWeekends: boolean;
    /** First day of week (0..6). */
    startOfWeek: number;
    /** Business-hours start (local), "HH:mm:ss". */
    businessHoursStartLocal: string;
    /** Business-hours end (local), "HH:mm:ss". */
    businessHoursEndLocal: string;
    /** Default calendar view. */
    defaultView: DefaultCalendarView;

    /** Calendar shading mode. */
    shadingMode: CalendarShadingMode;
    /** Availability enforcement level. */
    availabilityEnforcement: AvailabilityEnforcement;
    /** Require explicit confirmation for overrides. */
    requireConfirmOnOverrides: boolean;
    /** Whether provider availability is visible to all roles. */
    availabilityPublic: boolean;
    /** Whether providers can edit their own availability. */
    providersCanEditOwnAvailability: boolean;

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
