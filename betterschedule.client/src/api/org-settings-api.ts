import { api } from "@auth/axios";

/** String enums as exposed by the API */
export type DefaultCalendarView = "Day" | "Week" | "Month" | "Resources";
export type CalendarShadingMode = "None" | "OrgBusinessHours" | "ProviderAvailability";
export type AvailabilityEnforcement =
    | "None"
    | "Warn"
    | "BlockProvidersWarnManagers"
    | "BlockAllRequireOverride";

/** Read model (matches server OrgSettingsDto) */
export type OrgSettingsDto = {
    // Booking windows (TimeSpan on server -> string "d.HH:mm:ss" or "HH:mm:ss")
    bookingLeadTime?: string | null;
    cancellationWindow?: string | null;

    // Calendar display
    showWeekends: boolean;
    startOfWeek: number; // 0..6
    businessHoursStartLocal: string; // "HH:mm:ss"
    businessHoursEndLocal: string;   // "HH:mm:ss"
    defaultView: DefaultCalendarView;

    // Availability
    shadingMode: CalendarShadingMode;
    availabilityEnforcement: AvailabilityEnforcement;
    requireConfirmOnOverrides: boolean;
    availabilityPublic: boolean;
    providersCanEditOwnAvailability: boolean;

    // TZ/Locale
    timeZoneId: string;
    locale: string;

    // Notifications
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean;
    reminderHoursBefore?: number | null;
};

/** Update model (matches server UpdateOrgSettingsDto) */
export type UpdateOrgSettingsDto = Partial<{
    bookingLeadTime: string;          // "d.HH:mm:ss" or "HH:mm:ss"
    cancellationWindow: string;       // same
    showWeekends: boolean;
    startOfWeek: number;
    businessHoursStartLocal: string;  // "HH:mm:ss"
    businessHoursEndLocal: string;    // "HH:mm:ss"
    defaultView: DefaultCalendarView;
    shadingMode: CalendarShadingMode;
    availabilityEnforcement: AvailabilityEnforcement;
    requireConfirmOnOverrides: boolean;
    availabilityPublic: boolean;
    providersCanEditOwnAvailability: boolean;
    timeZoneId: string;
    locale: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean;
    reminderHoursBefore: number | null;
}>;

/* ------------------------- TimeSpan helpers ------------------------- */
/** Parse "d.HH:mm:ss" OR "HH:mm:ss" to total minutes. */
export function timeSpanToMinutes(ts?: string | null): number {
    if (!ts) return 0;
    const m = ts.match(/^((\d+)\.)?(\d{1,2}):([0-5]\d):([0-5]\d)$/);
    if (!m) return 0;
    const days = Number(m[2] ?? 0);
    const hours = Number(m[3] ?? 0);
    const minutes = Number(m[4] ?? 0);
    const seconds = Number(m[5] ?? 0);
    return days * 1440 + hours * 60 + minutes + Math.floor(seconds / 60);
}

/** Parse "d.HH:mm:ss" OR "HH:mm:ss" to total hours (rounded down). */
export function timeSpanToHours(ts?: string | null): number {
    return Math.floor(timeSpanToMinutes(ts) / 60);
}

/** Convert minutes -> "d.HH:mm:ss" (supports >24h). */
export function minutesToTimeSpan(totalMinutes: number): string {
    const clamped = Math.max(0, Math.floor(totalMinutes));
    const days = Math.floor(clamped / 1440);
    const remMin = clamped - days * 1440;
    const hh = String(Math.floor(remMin / 60)).padStart(2, "0");
    const mm = String(remMin % 60).padStart(2, "0");
    const ss = "00";
    return days > 0 ? `${days}.${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** Convert hours -> "d.HH:mm:ss" (supports >24h). */
export function hoursToTimeSpan(totalHours: number): string {
    const minutes = Math.max(0, Math.floor(totalHours * 60));
    return minutesToTimeSpan(minutes);
}

/** Ensure "HH:mm:ss" (append :00 if caller passes "HH:mm"). */
export function normalizeHHmmOrHHmmss(v: string): string {
    if (/^\d{1,2}:\d{2}$/.test(v)) return `${v}:00`;
    return v;
}

/* ------------------------------ API ------------------------------ */
export async function getOrgSettings(): Promise<OrgSettingsDto> {
    const { data } = await api.get<OrgSettingsDto>("/org-settings");
    return data;
}

export async function updateOrgSettings(payload: UpdateOrgSettingsDto): Promise<void> {
    await api.put("/org-settings", payload);
}
