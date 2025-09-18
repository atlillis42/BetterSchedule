import { DayPilot } from "@daypilot/daypilot-lite-react";
import { listAvailability } from "@/api/provider-availability-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import { isRangeWithinAnyRule, isWithinBusinessHours } from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

/** Map of provider id to their weekly rules. */
export type AvailabilityMap = Map<string, ProviderAvailabilityDto[]>;

/** Business-hours window expressed in "HH:mm". */
export type BusinessHours = { startHHmm: string; endHHmm: string };

/**
 * Builds a one-entry availability map for an overlay provider.
 * @param providerId - Provider user id.
 */
export async function fetchOverlayAvailabilityMap(providerId: string): Promise<AvailabilityMap> {
    const rules = await listAvailability(providerId);
    const map = new Map<string, ProviderAvailabilityDto[]>();
    map.set(providerId, rules);
    return map;
}

/**
 * Extracts business-hours window from organization settings as "HH:mm".
 * @param org - Organization settings
 */
export function buildBusinessHours(org: OrgSettingsDto | null): BusinessHours | null {
    if (!org) return null;
    return {
        startHHmm: org.businessHoursStartLocal.slice(0, 5),
        endHHmm: org.businessHoursEndLocal.slice(0, 5),
    };
}

/**
 * Overlay-aware availability preflight in org-local time when TZ provided.
 * @param availabilityByProvider - Rules grouped by provider id.
 * @param providerId - Provider to check (undefined = allow).
 * @param start - Start date/time (DayPilot.Date/Date/ISO).
 * @param end - End date/time (DayPilot.Date/Date/ISO).
 * @param orgTimeZoneId - Org IANA TZ for local-time comparisons.
 */
export function preflightAvailability(
    availabilityByProvider: AvailabilityMap,
    providerId: string | undefined,
    start: DayPilot.Date | Date | string,
    end: DayPilot.Date | Date | string,
    orgTimeZoneId?: string
): { allowed: boolean; reason?: string } {
    if (!providerId) return { allowed: true };
    const rules = availabilityByProvider.get(providerId);
    const ok = isRangeWithinAnyRule(rules, start, end, orgTimeZoneId);
    return ok ? { allowed: true } : { allowed: false, reason: Messages.OutsideProviderAvailability };
}

/**
 * Optional: org-business-hours preflight.
 * @param start - Start date/time (DayPilot.Date/Date/ISO).
 * @param end - End date/time (DayPilot.Date/Date/ISO).
 * @param bh - Business hours window or null to skip.
 * @param orgTimeZoneId - Org IANA TZ for local-time comparisons.
 */
export function preflightBusinessHours(
    start: DayPilot.Date | Date | string,
    end: DayPilot.Date | Date | string,
    bh: BusinessHours | null | undefined,
    orgTimeZoneId?: string
): { allowed: boolean; reason?: string } {
    if (!bh) return { allowed: true };
    const ok = isWithinBusinessHours(start, end, bh.startHHmm, bh.endHHmm, orgTimeZoneId);
    return ok ? { allowed: true } : { allowed: false, reason: Messages.OutsideOrgBusinessHours };
}
