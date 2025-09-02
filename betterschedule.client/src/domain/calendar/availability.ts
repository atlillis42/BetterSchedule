/**
 * Local-time availability utilities for calendar gating and shading.
 * @remarks
 * - Interprets inputs in the browser's local time (your org “wall time”).
 * - Compares times using fixed-width `"HH:mm"` lexicographic ordering.
 * - Uses end-exclusive range semantics: `[start, end)`.
 */
import type { DayOfWeek, ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";

/** Canonical day-of-week order matching the API union. */
const DOW: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Normalizes `"HH:mm[:ss]"` to `"HH:mm"`.
 * @param t A time string from the API or UI.
 */
export function toHHmm(t: string): string {
    return t.length >= 5 ? t.slice(0, 5) : t;
}

/**
 * Derives local date/time parts and day-of-week from an ISO string or `Date`.
 * @param input ISO 8601 string or `Date` in local time.
 * @returns `{ date: "YYYY-MM-DD", time: "HH:mm", dayOfWeek }`.
 */
export function toLocalParts(input: string | Date): { date: string; time: string; dayOfWeek: DayOfWeek } {
    let d: Date;

    if (input instanceof Date) {
        d = input;
    } else {
        d = new Date(input);
    }

    // Fallback for naive "YYYY-MM-DDTHH:mm" (treated as local).
    if (isNaN(d.getTime()) && typeof input === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
        const [ymd, hm] = input.split("T");
        const base = new Date(ymd + "T00:00:00");
        return { date: ymd, time: hm.slice(0, 5), dayOfWeek: DOW[base.getDay()] };
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const MM = String(d.getMinutes()).padStart(2, "0");

    return {
        date: `${yyyy}-${mm}-${dd}`,
        time: `${HH}:${MM}`,
        dayOfWeek: DOW[d.getDay()],
    };
}

/**
 * True when `[start, end)` falls fully inside a single weekly rule window.
 * @param rule Provider weekly rule.
 * @param startLocal Local parts for the start instant.
 * @param endLocal Local parts for the end instant.
 */
export function isRangeInsideRule(
    rule: ProviderAvailabilityDto,
    startLocal: { date: string; time: string; dayOfWeek: DayOfWeek },
    endLocal: { date: string; time: string; dayOfWeek: DayOfWeek },
): boolean {
    if (startLocal.dayOfWeek !== rule.dayOfWeek || endLocal.dayOfWeek !== rule.dayOfWeek) return false;
    if (!(rule.effectiveFrom <= startLocal.date && startLocal.date <= rule.effectiveTo)) return false;
    if (!(rule.effectiveFrom <= endLocal.date && endLocal.date <= rule.effectiveTo)) return false;

    const rStart = toHHmm(rule.startLocalTime);
    const rEnd = toHHmm(rule.endLocalTime);

    // Inclusive start, exclusive end.
    return (rStart <= startLocal.time) && (endLocal.time <= rEnd);
}

/**
 * True when any rule in the set covers `[start, end)`.
 * @param rules Weekly rules for a provider.
 * @param start Start instant (ISO or `Date`).
 * @param end End instant (ISO or `Date`).
 */
export function isRangeInsideAnyRule(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: string | Date,
    end: string | Date
): boolean {
    if (!rules?.length) return false;
    const s = toLocalParts(start);
    const e = toLocalParts(end);
    return rules.some(r => isRangeInsideRule(r, s, e));
}

/**
 * True when the provider’s rule map allows `[start, end)`.
 * If `providerId` is falsy, returns `true` (no overlay/gating).
 * @param providerRules Map keyed by `serviceProviderId`.
 * @param providerId Target provider id or `undefined`.
 */
export function isRangeAllowedForProvider(
    providerRules: Map<string, ProviderAvailabilityDto[]>,
    providerId: string | undefined,
    start: string | Date,
    end: string | Date
): boolean {
    if (!providerId) return true;
    const rules = providerRules.get(providerId);
    return isRangeInsideAnyRule(rules, start, end);
}

/**
 * True when `[start, end)` sits within org business-hours.
 * @param businessStartLocal `"HH:mm[:ss]"` (local).
 * @param businessEndLocal `"HH:mm[:ss]"` (local).
 */
export function isRangeInsideBusinessHours(
    start: string | Date,
    end: string | Date,
    businessStartLocal: string,
    businessEndLocal: string
): boolean {
    const s = toLocalParts(start).time;
    const e = toLocalParts(end).time;
    const bhStart = toHHmm(businessStartLocal);
    const bhEnd = toHHmm(businessEndLocal);

    return (bhStart <= s) && (e <= bhEnd);
}
