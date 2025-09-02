import { DayPilot } from "@daypilot/daypilot-lite-react";
import { listAvailability } from "@/api/provider-availability-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import { isRangeWithinProviderAvailability } from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

/** Map of provider id to their weekly rules. */
export type AvailabilityMap = Map<string, ProviderAvailabilityDto[]>;

/** Business-hours window expressed in "HH:mm". */
export type BusinessHours = { startHHmm: string; endHHmm: string };

/**
 * Builds a one-entry availability map for an overlay provider.
 * @param providerId Target provider id.
 */
export async function fetchOverlayAvailabilityMap(providerId: string): Promise<AvailabilityMap> {
    const rules = await listAvailability(providerId);
    const map = new Map<string, ProviderAvailabilityDto[]>();
    map.set(providerId, rules);
    return map;
}

/**
 * Extracts business-hours window from organization settings as "HH:mm".
 * @param org Organization settings or null.
 */
export function buildBusinessHours(org: OrgSettingsDto | null): BusinessHours | null {
    if (!org) return null;
    return {
        startHHmm: org.businessHoursStartLocal.slice(0, 5),
        endHHmm: org.businessHoursEndLocal.slice(0, 5),
    };
}

/**
 * Checks whether a time range is covered by the provider's availability rules.
 * @param rules Weekly rules or undefined.
 * @param start Range start (DayPilot.Date | Date | ISO string).
 * @param end Range end (DayPilot.Date | Date | ISO string).
 */
export function isWithinProviderRules(
    rules: ProviderAvailabilityDto[] | null | undefined,
    start: DayPilot.Date | Date | string,
    end: DayPilot.Date | Date | string
): boolean {
    return isRangeWithinProviderAvailability(rules, start, end);
}

/**
 * Performs an overlay-aware availability preflight.
 * @param availabilityByProvider Rules keyed by provider id.
 * @param providerId Target provider id or undefined.
 * @param start Range start (DayPilot.Date | Date | ISO string).
 * @param end Range end (DayPilot.Date | Date | ISO string).
 * @returns Allowed flag and a short reason when disallowed.
 */
export function preflightAvailability(
    availabilityByProvider: AvailabilityMap,
    providerId: string | undefined,
    start: DayPilot.Date | Date | string,
    end: DayPilot.Date | Date | string
): { allowed: boolean; reason?: string } {
    if (!providerId) return { allowed: true };
    const rules = availabilityByProvider.get(providerId);
    const ok = isRangeWithinProviderAvailability(rules, start, end);
    return ok ? { allowed: true } : { allowed: false, reason: Messages.OutsideProviderAvailability };
}
