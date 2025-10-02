import type { CalendarShadingMode } from "@/api/org-settings-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import {
    isRangeWithinProviderAvailability,
    isWithinBusinessHours,
} from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

/* helpers */
const appendClass = (existing: string | undefined, add: string) =>
    [existing, add].filter(Boolean).join(" ");
const cellProps = (args: any) => args?.cell?.properties ?? args?.cell; 
const oddHourFallback = "rgba(17,24,39,0.035)"; // ~3.5% subtle

export function createBeforeCellRender(opts: {
    shadingMode: CalendarShadingMode;
    availabilityByProvider: Map<string, ProviderAvailabilityDto[]>;
    overlayProviderId?: string;
    businessHours?: { startHHmm: string; endHHmm: string } | null;
    isProvider: boolean;
    isManager: boolean;
}) {
    const {
        shadingMode,
        availabilityByProvider,
        overlayProviderId,
        businessHours,
        isProvider,
        isManager,
    } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            // 1) Availability/business-hours shading (skip gracefully if inputs missing)
            let allowed: boolean | null = null;
            let reason: string | null = null;

            if (shadingMode === "ProviderAvailability") {
                const rules = overlayProviderId ? availabilityByProvider.get(overlayProviderId) : undefined;
                if (rules && rules.length > 0) {
                    allowed = isRangeWithinProviderAvailability(rules, args.cell.start, args.cell.end);
                    if (allowed === false) reason = Messages.OutsideProviderAvailability;
                }
            } else if (shadingMode === "OrgBusinessHours") {
                if (businessHours) {
                    allowed = isWithinBusinessHours(
                        args.cell.start,
                        args.cell.end,
                        businessHours.startHHmm,
                        businessHours.endHHmm
                    );
                    if (allowed === false) reason = Messages.OutsideOrgBusinessHours;
                }
            }

            if (allowed === false) {
                p.cssClass = appendClass(p.cssClass, "unavailable-cell");
                if (isProvider && !isManager) p.disabled = true;
                // (Tip: Calendar cells don't have a documented tooltip property; if needed, render p.html)
            }

            // 2) Readability: alternating odd-hour hint (ALWAYS runs)
            const start = args?.cell?.start;
            if (start && typeof start.toString === "function") {
                const hour = Number(start.toString("H")); // 0..23
                if (hour % 2 === 1) {
                    p.cssClass = appendClass(p.cssClass, "weekview_cell_hour_odd");
                    if (allowed !== false && !p.backColor) {
                        p.backColor = oddHourFallback; // subtle fallback even if CSS order wins
                    }
                }
            }
        } catch {
            /* no-op */
        }
    };
}

export function createBeforeSchedulerCellRender(opts: {
    shadingMode: CalendarShadingMode;
    availabilityByProvider: Map<string, ProviderAvailabilityDto[]>;
    overlayProviderId?: string;
    businessHours?: { startHHmm: string; endHHmm: string } | null;
    isProvider: boolean;
    isManager: boolean;
}) {
    const {
        shadingMode,
        availabilityByProvider,
        overlayProviderId,
        businessHours,
        isProvider,
        isManager,
    } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            let allowed: boolean | null = null;
            let reason: string | null = null;

            if (shadingMode === "ProviderAvailability") {
                const rules = overlayProviderId ? availabilityByProvider.get(overlayProviderId) : undefined;
                if (rules && rules.length > 0) {
                    allowed = isRangeWithinProviderAvailability(rules, args.cell.start, args.cell.end);
                    if (allowed === false) reason = Messages.OutsideProviderAvailability;
                }
            } else if (shadingMode === "OrgBusinessHours") {
                if (businessHours) {
                    allowed = isWithinBusinessHours(
                        args.cell.start,
                        args.cell.end,
                        businessHours.startHHmm,
                        businessHours.endHHmm
                    );
                    if (allowed === false) reason = Messages.OutsideOrgBusinessHours;
                }
            }

            if (allowed === false) {
                p.cssClass = appendClass(p.cssClass, "unavailable-cell");
                if (isProvider && !isManager) p.disabled = true;
            }

        } catch {
            /* no-op */
        }
    };
}
