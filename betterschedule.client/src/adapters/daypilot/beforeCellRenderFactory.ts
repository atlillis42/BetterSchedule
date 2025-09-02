import type { CalendarShadingMode } from "@/api/org-settings-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import {
    isRangeWithinProviderAvailability,
    isWithinBusinessHours,
} from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

/**
 * Produces a DayPilot Calendar `onBeforeCellRender` handler
 * that applies availability/business-hours shading.
 */
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
        let allowed: boolean | null = null;
        let reason: string | null = null;

        if (shadingMode === "ProviderAvailability") {
            if (!overlayProviderId) return;
            const rules = availabilityByProvider.get(overlayProviderId);
            if (!rules || rules.length === 0) return;

            allowed = isRangeWithinProviderAvailability(rules, args.cell.start, args.cell.end);
            if (!allowed) reason = Messages.OutsideProviderAvailability;
        } else if (shadingMode === "OrgBusinessHours") {
            if (!businessHours) return;
            allowed = isWithinBusinessHours(
                args.cell.start,
                args.cell.end,
                businessHours.startHHmm,
                businessHours.endHHmm
            );
            if (!allowed) reason = Messages.OutsideOrgBusinessHours;
        } else {
            return; // "None"
        }

        if (allowed === false) {
            args.cell.cssClass = "unavailable-cell";
            if (reason) args.cell.toolTip = reason;
            if (isProvider && !isManager) args.cell.disabled = true;
        }
    };
}

/**
 * Produces a DayPilot Scheduler `onBeforeCellRender` handler
 * mirroring `createBeforeCellRender` for the Resources view.
 *
 * Notes:
 * - Scheduler cells expose the same `start`/`end` range on `args.cell`.
 * - Provider overlay logic is time-based only; resource dimension is not considered here.
 */
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
        let allowed: boolean | null = null;
        let reason: string | null = null;

        if (shadingMode === "ProviderAvailability") {
            if (!overlayProviderId) return;
            const rules = availabilityByProvider.get(overlayProviderId);
            if (!rules || rules.length === 0) return;

            allowed = isRangeWithinProviderAvailability(rules, args.cell.start, args.cell.end);
            if (!allowed) reason = Messages.OutsideProviderAvailability;
        } else if (shadingMode === "OrgBusinessHours") {
            if (!businessHours) return;
            allowed = isWithinBusinessHours(
                args.cell.start,
                args.cell.end,
                businessHours.startHHmm,
                businessHours.endHHmm
            );
            if (!allowed) reason = Messages.OutsideOrgBusinessHours;
        } else {
            return; // "None"
        }

        if (allowed === false) {
            args.cell.cssClass = "unavailable-cell";
            if (reason) args.cell.toolTip = reason;
            if (isProvider && !isManager) args.cell.disabled = true;
        }
    };
}
