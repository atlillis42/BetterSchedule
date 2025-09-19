import { useMemo } from "react";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import { buildBusinessHours } from "@/services/availabilityService";
import type { AvailabilityMap } from "@/services/availabilityService";

/**
 * Provides DayPilot event and cell renderers derived from organization settings and availability overlays.
 */
export function useEventStyling(params: {
    org: OrgSettingsDto | null;
    availabilityByProvider: AvailabilityMap;
    overlayProviderId?: string;
    isProvider: boolean;
    isManager: boolean;
}) {
    const { org, availabilityByProvider, overlayProviderId, isProvider, isManager } = params;

    const beforeCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        const bh = buildBusinessHours(org);
        return createBeforeCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours: bh,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, isProvider, isManager]);

    const beforeSchedulerCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        const bh = buildBusinessHours(org);
        return createBeforeSchedulerCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours: bh,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, isProvider, isManager]);

    const beforeEventRender = useMemo(() => createBeforeEventRender(), []);

    return { beforeCellRender, beforeSchedulerCellRender, beforeEventRender };
}
