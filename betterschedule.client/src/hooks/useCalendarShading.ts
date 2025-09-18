import { useMemo } from "react";
import { createBeforeCellRender, createBeforeSchedulerCellRender } from "@/adapters/daypilot/beforeCellRenderFactory";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import type { BusinessHours } from "@/services/availabilityService";

/** Availability rules keyed by provider id. */
type AvailabilityMap = Map<string, ProviderAvailabilityDto[]>;

/**
 * Composes DayPilot Lite shading callbacks for Day/Week (Calendar) and Resources (Scheduler),
 * along with the event styling hook. This centralizes time-zone handling, overlay selection,
 * and organization shading mode decisions.
 *
 * @param params.org - Organization settings (for `shadingMode` and `timeZoneId`).
 * @param params.availabilityByProvider - Weekly availability rules, keyed by provider id.
 * @param params.overlayProviderId - Provider selected for overlay shading; undefined disables ProviderAvailability shading.
 * @param params.isProvider - Whether the current user has the Provider role.
 * @param params.isManager - Whether the current user has the Manager role.
 * @param params.businessHours - Optional org business hours window ("HH:mm" range).
 *
 * @returns DayPilot Lite callback trio and a UI flag indicating whether the overlay selector should be shown.
 */
export function useCalendarShading(params: {
    org: OrgSettingsDto | null;
    availabilityByProvider: AvailabilityMap;
    overlayProviderId?: string;
    isProvider: boolean;
    isManager: boolean;
    businessHours: BusinessHours | null;
}) {
    const { org, availabilityByProvider, overlayProviderId, isProvider, isManager, businessHours } = params;


    const shadingMode = org?.shadingMode ?? "ProviderAvailability";

    const beforeCellRender = useMemo(
        () =>
            createBeforeCellRender({
                shadingMode,
                availabilityByProvider,
                overlayProviderId,
                businessHours,
                isProvider,
                isManager,
                orgTimeZoneId: org?.timeZoneId,
            }),
        [shadingMode, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager, org?.timeZoneId,]
    );

    const beforeSchedulerCellRender = useMemo(
        () =>
            createBeforeSchedulerCellRender({
                shadingMode,
                availabilityByProvider,
                overlayProviderId,
                businessHours,
                isProvider,
                isManager,
                orgTimeZoneId: org?.timeZoneId,
            }),
        [shadingMode, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager, org?.timeZoneId,]
    );

    const beforeEventRender = useMemo(() => createBeforeEventRender(), []);

    const showOverlaySelector = shadingMode === "ProviderAvailability";

    return {
        beforeCellRender,
        beforeSchedulerCellRender,
        beforeEventRender,
        showOverlaySelector,
    };
}
