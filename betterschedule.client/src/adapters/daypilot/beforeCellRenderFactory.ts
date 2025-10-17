/**
 * DayPilot cell render helpers (provider-availability removed).
 * - Adds an "off-hours" class when a cell falls outside org business hours (if provided).
 * - Adds a subtle odd-hour hint for readability.
 */

import type { BusinessHours } from "@/services/businessHoursService";

/* helpers */
const appendClass = (existing: string | undefined, add: string) =>
    [existing, add].filter(Boolean).join(" ");
const cellProps = (args: any) => args?.cell?.properties ?? args?.cell;
const oddHourFallback = "rgba(17,24,39,0.035)"; // ~3.5% subtle

function toHHmm(v: string | undefined): string {
    return v ? v.slice(0, 5) : "";
}

function isWithinBusinessHoursLocal(
    start: any,
    end: any,
    businessHours?: BusinessHours | null
): boolean | null {
    if (!businessHours) return null;
    try {
        const s = String(start?.toString?.("HH:mm") ?? "");
        const e = String(end?.toString?.("HH:mm") ?? "");
        const bhStart = toHHmm(businessHours.startHHmm);
        const bhEnd = toHHmm(businessHours.endHHmm);
        if (!s || !e || !bhStart || !bhEnd) return null;
        // Inclusive start, exclusive end: [bhStart, bhEnd)
        return bhStart <= s && e <= bhEnd;
    } catch {
        return null;
    }
}

export function createBeforeCellRender(opts: {
    /** Optional org business hours in "HH:mm". If omitted, no off-hours shading. */
    businessHours?: BusinessHours | null;
}) {
    const { businessHours } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            // Off-hours shading
            const within = isWithinBusinessHoursLocal(
                args?.cell?.start,
                args?.cell?.end,
                businessHours
            );
            if (within === false) {
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
                // Intentionally not disabling cells; off-hours remain scrollable/selectable.
            }

            // Readability: alternating odd-hour hint
            const start = args?.cell?.start;
            if (start && typeof start.toString === "function") {
                const hour = Number(start.toString("H")); // 0..23
                if (hour % 2 === 1) {
                    p.cssClass = appendClass(p.cssClass, "weekview_cell_hour_odd");
                    if (within !== false && !p.backColor) {
                        p.backColor = oddHourFallback;
                    }
                }
            }
        } catch {
            /* no-op */
        }
    };
}

export function createBeforeSchedulerCellRender(opts: {
    /** Optional org business hours in "HH:mm". If omitted, no off-hours shading. */
    businessHours?: BusinessHours | null;
}) {
    const { businessHours } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            const within = isWithinBusinessHoursLocal(
                args?.cell?.start,
                args?.cell?.end,
                businessHours
            );
            if (within === false) {
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
            }
        } catch {
            /* no-op */
        }
    };
}
