/**
 * Local-time availability utilities for calendar gating and shading.
 *
 * Semantics:
 * - Interprets inputs in the browser's local time (“wall time”).
 * - Compares times using fixed-width "HH:mm" lexicographic ordering.
 * - End-exclusive ranges: [start, end).
 * - Rules are evaluated within a single day (no cross-midnight windows).
 */

import type { DayOfWeek, ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";

/** Canonical day-of-week order matching Sunday=0..Saturday=6. */
const DOW_NAMES: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type LocalParts = { date: string; time: string; dayOfWeek: DayOfWeek };

/**
 * Normalizes "HH:mm[:ss]" to "HH:mm".
 */
export function toHHmm(time: string): string {
    return time.length >= 5 ? time.slice(0, 5) : time;
}

/**
 * Converts unknown input (Date, ISO string, DayPilot.Date-like) to local parts.
 */
export function toLocalParts(input: unknown): LocalParts {
    // DayPilot.Date: prefer toDate() if present
    if (input && typeof (input as any).toDate === "function") {
        return dateToLocalParts((input as any).toDate() as Date);
    }
    // Generic object with toString() that parses as Date
    if (input && typeof (input as any).toString === "function" && !(input instanceof Date) && typeof input !== "string") {
        const s = (input as any).toString() as string;
        const d = new Date(s);
        if (!isNaN(d.getTime())) return dateToLocalParts(d);
    }

    if (input instanceof Date) return dateToLocalParts(input);

    if (typeof input === "string") {
        const d = new Date(input);

        // Fallback for naive "YYYY-MM-DDTHH:mm" treated as local
        if (isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
            const [ymd, hm] = input.split("T");
            const base = new Date(ymd + "T00:00:00");
            return { date: ymd, time: hm.slice(0, 5), dayOfWeek: DOW_NAMES[base.getDay()] };
        }

        return dateToLocalParts(d);
    }

    // Last resort: now (should not occur in normal use)
    return dateToLocalParts(new Date());
}

function dateToLocalParts(d: Date): LocalParts {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");
    return {
        date: `${yyyy}-${mm}-${dd}`,
        time: `${HH}:${MM}`,
        dayOfWeek: DOW_NAMES[d.getDay()],
    };
}

/**
 * Normalizes an incoming DayOfWeek (number or string) to the name form.
 */
function normalizeDayOfWeek(dow: unknown): DayOfWeek | null {
    if (typeof dow === "number") {
        return DOW_NAMES[dow] ?? null;
    }
    if (typeof dow === "string") {
        // Numeric string?
        if (/^[0-6]$/.test(dow)) {
            return DOW_NAMES[Number(dow)] ?? null;
        }
        // Name, various casing
        const title = dow.slice(0, 1).toUpperCase() + dow.slice(1).toLowerCase();
        return (DOW_NAMES as string[]).includes(title) ? (title as DayOfWeek) : null;
    }
    return null;
}

/**
 * True when [start, end) falls fully inside a single weekly rule window.
 * Dates must sit within the rule's effectiveFrom/effectiveTo (inclusive).
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
    if (windowStart === "" || windowEnd === "") return false;

    // Inclusive start, exclusive end: [windowStart, windowEnd)
    return windowStart <= startLocal.time && endLocal.time <= windowEnd;
}

/**
 * True when any rule in the set covers [start, end).
 */
export function isRangeWithinAnyRule(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: unknown,
    end: unknown
): boolean {
    if (!rules || rules.length === 0) return false;
    const s = toLocalParts(start);
    const e = toLocalParts(end);
    return rules.some((r) => isRangeWithinRule(r, s, e));
}

/**
 * True when the provider’s rule map allows [start, end).
 * If providerId is undefined, returns true (no overlay/gating).
 */
export function isRangeAllowedForProvider(
    providerRules: Map<string, ProviderAvailabilityDto[]>,
    providerId: string | undefined,
    start: unknown,
    end: unknown
): boolean {
    if (!providerId) return true;
    const rules = providerRules.get(providerId);
    return isRangeWithinAnyRule(rules, start, end);
}

/**
 * True when [start, end) sits within org business-hours.
 * businessStartLocal and businessEndLocal are "HH:mm" or "HH:mm:ss".
 */
export function isWithinBusinessHours(
    start: unknown,
    end: unknown,
    businessStartLocal: string,
    businessEndLocal: string
): boolean {
    const s = toLocalParts(start).time;
    const e = toLocalParts(end).time;
    const bhStart = toHHmm(businessStartLocal);
    const bhEnd = toHHmm(businessEndLocal);
    return bhStart <= s && e <= bhEnd;
}

/**
 * Primary export used by UI/adapters: weekly-rule gating for [start, end).
 */
export function isRangeWithinProviderAvailability(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: unknown,
    end: unknown
): boolean {
    return isRangeWithinAnyRule(rules, start, end);
}

/** Accepts DateOnly string or Date/DayPilot-like and returns "YYYY-MM-DD". */
function toDateOnlyString(input: unknown): string {
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = toLocalParts(input as any);
    return d.date;
}
