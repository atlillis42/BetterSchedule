import type { CalendarShadingMode } from "@/api/org-settings-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import {
    isRangeWithinProviderAvailability,
    isWithinBusinessHours,
} from "@/domain/calendar/availability";
import { Messages } from "@/domain/calendar/messages";

type BusinessHours = { startHHmm: string; endHHmm: string };

/**
 * Produces a DayPilot Day/Week cell shading callback.
 * Applies provider-availability or business-hours rules, comparing in organization time when provided.
 */
export function createBeforeCellRender(opts: {
    shadingMode: CalendarShadingMode;
    availabilityByProvider: Map<string, ProviderAvailabilityDto[]>;
    overlayProviderId?: string;
    businessHours?: BusinessHours | null;
    isProvider: boolean;
    isManager: boolean;
    /** Organization IANA time zone identifier, e.g., "America/New_York". */
    orgTimeZoneId?: string;
    /** Optional debug toggles used in development. */
    debug?: {
        /** Paints all cells to visually confirm the callback runs. */
        paintAll?: boolean;
        /** Logs a sample cell per column for quick inspection. */
        log?: boolean;
    };
}) {
    const {
        shadingMode,
        availabilityByProvider,
        overlayProviderId,
        businessHours,
        isProvider,
        isManager,
        orgTimeZoneId,
        debug,
    } = opts;

    return (args: any) => {
        if (debug?.paintAll) {
            args.cell.backColor = "#fee2e2";
            return;
        }

        let allowed: boolean | null = null;
        let reason: string | null = null;

        if (shadingMode === "ProviderAvailability") {
            if (!overlayProviderId) return;
            const rules = availabilityByProvider.get(overlayProviderId);
            if (!rules || rules.length === 0) return;

            allowed = isRangeWithinProviderAvailability(
                rules,
                args.cell.start,
                args.cell.end,
                orgTimeZoneId
            );
            if (!allowed) reason = Messages.OutsideProviderAvailability;

            if (debug?.log) {
                const s = args.cell.start?.toString?.("HH:mm");
                if (s === "09:00") {
                    const day = args.cell.start?.toString?.("yyyy-MM-dd ddd");
                    // eslint-disable-next-line no-console
                    console.log(
                        "[beforeCellRender] overlay=%s rules=%d sampleCell=%s allowed=%s tz=%s",
                        overlayProviderId,
                        rules.length,
                        `${day} ${s}`,
                        String(allowed),
                        orgTimeZoneId ?? "(browser)"
                    );
                }
            }
        } else if (shadingMode === "OrgBusinessHours") {
            if (!businessHours) return;
            allowed = isWithinBusinessHours(
                args.cell.start,
                args.cell.end,
                businessHours.startHHmm,
                businessHours.endHHmm,
                orgTimeZoneId
            );
            if (!allowed) reason = Messages.OutsideOrgBusinessHours;
        } else {
            return;
        }

        if (allowed === false) {
            args.cell.backColor = "#f1f5f9";
            args.cell.cssClass = "unavailable-cell";
            if (reason) args.cell.toolTip = reason;
            if (isProvider && !isManager) args.cell.disabled = true;
        }
    };
}

/**
 * Produces a DayPilot Scheduler cell shading callback using the same rules as Day/Week.
 */
export function createBeforeSchedulerCellRender(
    opts: Parameters<typeof createBeforeCellRender>[0]
) {
    return createBeforeCellRender(opts);
}
