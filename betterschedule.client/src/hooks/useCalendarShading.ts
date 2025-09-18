import { useMemo, useCallback } from "react";
import { createBeforeCellRender, createBeforeSchedulerCellRender } from "@/adapters/daypilot/beforeCellRenderFactory";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";

type AvailabilityMap = Map<string, ProviderAvailabilityDto[]>;

function getDebugFlags() {
    if (!import.meta.env.DEV) return undefined;
    const url = new URL(window.location.href);
    const paintAll = url.searchParams.get("paintAll") === "true" || localStorage.getItem("cal.debug.paintAll") === "true";
    const log = url.searchParams.get("shadeLog") === "true" || localStorage.getItem("cal.debug.shadeLog") === "true";
    return (paintAll || log) ? { paintAll, log } : undefined;
}

/**
 * Provides shading callbacks (Day/Week/Scheduler), a stable render key,
 * and whether the overlay selector should be visible.
 */
export function useCalendarShading(params: {
    org: OrgSettingsDto | null;
    availabilityByProvider: AvailabilityMap;
    overlayProviderId?: string;
    isProvider: boolean;
    isManager: boolean;
    businessHours: { startHHmm: string; endHHmm: string } | null;
}) {
    const { org, availabilityByProvider, overlayProviderId, isProvider, isManager, businessHours } = params;

    const debug = getDebugFlags();
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
                debug,
            }),
        [shadingMode, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager, org?.timeZoneId, debug]
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
                debug,
            }),
        [shadingMode, availabilityByProvider, overlayProviderId, businessHours, isProvider, isManager, org?.timeZoneId, debug]
    );

    const beforeEventRender = useMemo(() => createBeforeEventRender(), []);

    const showOverlaySelector = shadingMode === "ProviderAvailability";

    const makeRenderKey = useCallback(
        (view: string) =>
            [
                "cal",
                view,
                shadingMode,
                overlayProviderId ?? "off",
                org?.timeZoneId ?? "tz",
                debug?.paintAll ? "pink" : "normal",
            ].join("-"),
        [overlayProviderId, shadingMode, org?.timeZoneId, debug?.paintAll]
    );

    return {
        beforeCellRender,
        beforeSchedulerCellRender,
        beforeEventRender,
        makeRenderKey,
        showOverlaySelector,
    };
}
