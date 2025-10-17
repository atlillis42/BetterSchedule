import type { OrgSettingsDto } from "@/api/org-settings-api";

/** Business-hours window expressed in "HH:mm". */
export type BusinessHours = { startHHmm: string; endHHmm: string };

/** Extracts business-hours window from organization settings as "HH:mm". */
export function buildBusinessHours(org: OrgSettingsDto | null): BusinessHours | null {
    if (!org) return null;
    const toHHmm = (s?: string) => (s ? s.slice(0, 5) : "");
    return {
        startHHmm: toHHmm(org.businessHoursStartLocal),
        endHHmm: toHHmm(org.businessHoursEndLocal),
    };
}
