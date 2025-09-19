/**
 * Availability utilities for calendar gating (no shading).
 * Compares time ranges in browser-local time by default, or in a specified organization time zone.
 *
 * Conventions:
 * - Time window comparisons use "HH:mm" strings with end-exclusive semantics: [start, end).
 * - Weekly rules are evaluated within a single day (no cross-midnight windows).
 */

import type { DayOfWeek, ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";

/** Canonical day-of-week order: Sunday=0..Saturday=6. */
const DOW_NAMES: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

type LocalParts = { date: string; time: string; dayOfWeek: DayOfWeek };

/**
 * Normalizes "HH:mm[:ss]" to "HH:mm".
 * @param time - Time string (hour:minute with optional seconds).
 * @returns "HH:mm".
 */
export function toHHmm(time: string): string {
    return time.length >= 5 ? time.slice(0, 5) : time;
}

/**
 * Splits an input into local parts `{ date, time, dayOfWeek }`.
 * When `orgTimeZoneId` is provided, generates parts in that time zone; otherwise uses browser local time.
 * @param input - Date | string | DayPilot.Date-like (with toDate) | naive "YYYY-MM-DDTHH:mm"
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
export function toLocalParts(input: unknown, orgTimeZoneId?: string): LocalParts {
    let d: Date | null = null;

    if (input && typeof (input as any).toDate === "function") {
        d = (input as any).toDate() as Date;
    } else if (input instanceof Date) {
        d = input;
    } else if (typeof input === "string") {
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
            d = parsed;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
            // Naive "YYYY-MM-DDTHH:mm" treated as local wall time
            const [ymd, hm] = input.split("T");
            const base = new Date(ymd + "T00:00:00");
            return { date: ymd, time: hm.slice(0, 5), dayOfWeek: DOW_NAMES[base.getDay()] };
        }
    }

    if (!d) d = new Date();
    return orgTimeZoneId ? partsInZone(d, orgTimeZoneId) : dateToLocalParts(d);
}

/**
 * Browser-local split into `{ date, time, dayOfWeek }`.
 * @param d - Date instance.
 */
function dateToLocalParts(d: Date): LocalParts {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}`, dayOfWeek: DOW_NAMES[d.getDay()] };
}

/**
 * Org-time split using `Intl.DateTimeFormat` with `timeZone`.
 * @param d - Date instance.
 * @param timeZone - IANA time zone identifier.
 */
function partsInZone(d: Date, timeZone: string): LocalParts {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "long",
    });
    const parts = fmt.formatToParts(d);
    const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";

    const yyyy = get("year");
    const mm = get("month");
    const dd = get("day");
    const weekday = (get("weekday") || "").replace(/^\w/, (c) => c.toUpperCase()) as DayOfWeek;
    const HH = get("hour").padStart(2, "0");
    const MM = get("minute").padStart(2, "0");

    return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}`, dayOfWeek: weekday };
}

/**
 * Normalizes an incoming DayOfWeek (number or string) to the name form.
 * @param dow - 0..6 | name.
 */
function normalizeDayOfWeek(dow: unknown): DayOfWeek | null {
    if (typeof dow === "number") return DOW_NAMES[dow] ?? null;
    if (typeof dow === "string") {
        if (/^[0-6]$/.test(dow)) return DOW_NAMES[Number(dow)] ?? null;
        const title = dow.slice(0, 1).toUpperCase() + dow.slice(1).toLowerCase();
        return (DOW_NAMES as string[]).includes(title) ? (title as DayOfWeek) : null;
    }
    return null;
}

/**
 * Returns "YYYY-MM-DD" for DateOnly or general input, in org time when specified.
 * @param input - Input value.
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
function toDateOnlyString(input: unknown, orgTimeZoneId?: string): string {
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const p = toLocalParts(input as any, orgTimeZoneId);
    return p.date;
}

/**
 * True when `[start, end)` falls fully inside a single weekly rule window.
 * Dates must lie within the rule's effectiveFrom/effectiveTo (inclusive).
 * @param rule - Provider rule.
 * @param startLocal - Start local parts.
 * @param endLocal - End local parts.
 */
export function isRangeWithinRule(
    rule: ProviderAvailabilityDto,
    startLocal: LocalParts,
    endLocal: LocalParts
): boolean {
    const ruleDow = normalizeDayOfWeek((rule as any).dayOfWeek);
    if (!ruleDow) return false;
    if (startLocal.dayOfWeek !== ruleDow || endLocal.dayOfWeek !== ruleDow) return false;

    const effectiveFrom = toDateOnlyString((rule as any).effectiveFrom);
    const effectiveTo = toDateOnlyString((rule as any).effectiveTo);
    if (!(effectiveFrom <= startLocal.date && startLocal.date <= effectiveTo)) return false;
    if (!(effectiveFrom <= endLocal.date && endLocal.date <= effectiveTo)) return false;

    const windowStart = toHHmm((rule as any).startLocalTime ?? (rule as any).startLocal ?? "");
    const windowEnd = toHHmm((rule as any).endLocalTime ?? (rule as any).endLocal ?? "");
    if (!windowStart || !windowEnd) return false;

    return windowStart <= startLocal.time && endLocal.time <= windowEnd;
}

/**
 * True when any rule in the set covers `[start, end)`.
 * @param rules - Collection of provider rules.
 * @param start - Proposed start.
 * @param end - Proposed end.
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
export function isRangeWithinAnyRule(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: unknown,
    end: unknown,
    orgTimeZoneId?: string
): boolean {
    if (!rules || rules.length === 0) return false;
    const s = toLocalParts(start, orgTimeZoneId);
    const e = toLocalParts(end, orgTimeZoneId);
    return rules.some((r) => isRangeWithinRule(r, s, e));
}

/**
 * True when a provider's rule map allows `[start, end)`.
 * When `providerId` is undefined, allows by default.
 * @param providerRules - Map keyed by provider id.
 * @param providerId - Provider id to evaluate (optional).
 * @param start - Proposed start.
 * @param end - Proposed end.
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
export function isRangeAllowedForProvider(
    providerRules: Map<string, ProviderAvailabilityDto[]>,
    providerId: string | undefined,
    start: unknown,
    end: unknown,
    orgTimeZoneId?: string
): boolean {
    if (!providerId) return true;
    const rules = providerRules.get(providerId);
    return isRangeWithinAnyRule(rules, start, end, orgTimeZoneId);
}

/**
 * True when `[start, end)` sits within organization business hours.
 * `businessStartLocal` and `businessEndLocal` are "HH:mm" or "HH:mm:ss".
 * @param start - Proposed start.
 * @param end - Proposed end.
 * @param businessStartLocal - Org business start "HH:mm".
 * @param businessEndLocal - Org business end "HH:mm".
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
export function isWithinBusinessHours(
    start: unknown,
    end: unknown,
    businessStartLocal: string,
    businessEndLocal: string,
    orgTimeZoneId?: string
): boolean {
    const s = toLocalParts(start, orgTimeZoneId).time;
    const e = toLocalParts(end, orgTimeZoneId).time;
    const bhStart = toHHmm(businessStartLocal);
    const bhEnd = toHHmm(businessEndLocal);
    return bhStart <= s && e <= bhEnd;
}

/**
 * Primary helper used by UI adapters to evaluate weekly availability for a time range.
 * When `orgTimeZoneId` is provided, comparisons are made in that zone.
 * @param rules - Provider rules.
 * @param start - Proposed start.
 * @param end - Proposed end.
 * @param orgTimeZoneId - Optional IANA time zone id.
 */
export function isRangeWithinProviderAvailability(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: unknown,
    end: unknown,
    orgTimeZoneId?: string
): boolean {
    return isRangeWithinAnyRule(rules, start, end, orgTimeZoneId);
}

/**
 * Derives a suggested "business hours" band from provider availability rules, optionally clamped by org business hours.
 * Useful for setting DayPilot `businessBeginsHour`/`businessEndsHour` to reduce empty space.
 *
 * @param rules - Provider availability rules.
 * @param orgStartHHmm - Optional organization start, e.g., "09:00".
 * @param orgEndHHmm - Optional organization end, e.g., "17:00".
 * @returns `{ startHHmm, endHHmm }` or `null` when no overlap exists.
 */
export function deriveBusinessHoursFromAvailability(
    rules: ProviderAvailabilityDto[] | null | undefined,
    orgStartHHmm?: string,
    orgEndHHmm?: string
): { startHHmm: string; endHHmm: string } | null {
    if (!rules || rules.length === 0) {
        return orgStartHHmm && orgEndHHmm ? { startHHmm: toHHmm(orgStartHHmm), endHHmm: toHHmm(orgEndHHmm) } : null;
    }

    // Aggregate min start / max end across all rules (weekly), then clamp to org BH if provided.
    let minStart = "23:59";
    let maxEnd = "00:00";
    for (const r of rules) {
        const s = toHHmm((r as any).startLocalTime ?? (r as any).startLocal ?? "");
        const e = toHHmm((r as any).endLocalTime ?? (r as any).endLocal ?? "");
        if (!s || !e) continue;
        if (s < minStart) minStart = s;
        if (e > maxEnd) maxEnd = e;
    }

    if (minStart >= maxEnd) {
        return orgStartHHmm && orgEndHHmm ? { startHHmm: toHHmm(orgStartHHmm), endHHmm: toHHmm(orgEndHHmm) } : null;
    }

    const start = orgStartHHmm ? (toHHmm(orgStartHHmm) > minStart ? toHHmm(orgStartHHmm) : minStart) : minStart;
    const end = orgEndHHmm ? (toHHmm(orgEndHHmm) < maxEnd ? toHHmm(orgEndHHmm) : maxEnd) : maxEnd;

    if (start >= end) return null;
    return { startHHmm: start, endHHmm: end };
}
