import { useMemo } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { createBeforeCellRender, createBeforeSchedulerCellRender } from "@/adapters/daypilot/beforeCellRenderFactory";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";
import type { OrgSettingsDto } from "@/api/org-settings-api";
import { buildBusinessHours } from "@/services/availabilityService";
import type { AvailabilityMap } from "@/services/availabilityService";

/** Safe ticks getter for DayPilot.Date or ISO/string. */
function ticks(v: any): number | undefined {
    if (!v) return undefined;
    try {
        // DayPilot.Date has getTime(); JS Date has getTime(); strings can be wrapped
        if (typeof v.getTime === "function") return v.getTime();
        return new DayPilot.Date(v).getTime();
    } catch {
        return undefined;
    }
}

export function useEventStyling(params: {
    org: OrgSettingsDto | null;
    availabilityByProvider: AvailabilityMap;
    overlayProviderId?: string;
    isProvider: boolean;
    isManager: boolean;
}) {
    const { org, availabilityByProvider, overlayProviderId, isProvider, isManager } = params;

    const baseBeforeCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        const businessHours = buildBusinessHours(org);
        return createBeforeCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, isProvider, isManager]);

    const beforeCellRender = useMemo(() => {
        return (args: any) => {
            baseBeforeCellRender?.(args);

            try {
                const nowTicks = new DayPilot.Date().getTime();
                const s = ticks(args?.cell?.start);
                const e = ticks(args?.cell?.end);
                if (nowTicks != null && s != null && e != null && nowTicks >= s && nowTicks < e) {
                    args.cell.cssClass = [args.cell.cssClass, "cell-now"].filter(Boolean).join(" ");
                }
            } catch {
                /* noop */
            }
        };
    }, [baseBeforeCellRender]);

    const baseBeforeSchedulerCellRender = useMemo(() => {
        const shadingMode = org?.shadingMode ?? "ProviderAvailability";
        const businessHours = buildBusinessHours(org);
        return createBeforeSchedulerCellRender({
            shadingMode,
            availabilityByProvider,
            overlayProviderId,
            businessHours,
            isProvider,
            isManager,
        });
    }, [org, availabilityByProvider, overlayProviderId, isProvider, isManager]);

    const beforeSchedulerCellRender = useMemo(() => {
        return (args: any) => {
            baseBeforeSchedulerCellRender?.(args);

            try {
                const nowTicks = new DayPilot.Date().getTime();
                const s = ticks(args?.cell?.start);
                const e = ticks(args?.cell?.end);
                if (nowTicks != null && s != null && e != null && nowTicks >= s && nowTicks < e) {
                    args.cell.cssClass = [args.cell.cssClass, "cell-now"].filter(Boolean).join(" ");
                }
            } catch {
                /* noop */
            }
        };
    }, [baseBeforeSchedulerCellRender]);

    const beforeEventRender = useMemo(() => createBeforeEventRender(), []);

    return { beforeCellRender, beforeSchedulerCellRender, beforeEventRender };
}
