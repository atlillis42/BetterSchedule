/**
 * DayPilot cell render helpers (provider-availability removed).
 * - Treats weekends as OFF-hours by default (no business-hour alternation).
 * - Adds an "off-hours" class when a cell falls outside org business hours.
 * - Adds a subtle odd-hour hint for readability (BUSINESS hours only).
 */

import type { BusinessHours } from "@/services/businessHoursService";

/* helpers */
const appendClass = (existing: string | undefined, add: string) =>
    [existing, add].filter(Boolean).join(" ");
const cellProps = (args: any) => args?.cell?.properties ?? args?.cell;

// ~3.5% subtle; used only for BUSINESS odd-hour stripe
const oddHourFallback = "rgba(17,24,39,0.035)";

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

function isWeekend(start: any): boolean {
    try {
        // Prefer native getDay if present (0=Sun..6=Sat)
        const d =
            start?.getDay?.() ??
            start?.dayOfWeek?.() ??
            start?.dayOfWeek ??
            (() => {
                // best-effort fallback if DayPilot exposes a JS Date
                const js: any = start?.toDate?.() ?? start?.toDateLocal?.() ?? null;
                if (js instanceof Date) return js.getDay();
                return NaN;
            })();
        return d === 0 || d === 6;
    } catch {
        return false;
    }
}

export function createBeforeCellRender(opts: {
    /** Optional org business hours in "HH:mm". If omitted, no off-hours shading. */
    businessHours?: BusinessHours | null;
    /** When true, weekends follow business hours. Default: false (treat as off-hours). */
    weekendsAreBusiness?: boolean;
}) {
    const { businessHours, weekendsAreBusiness = false } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            // Weekend handling (default: OFF-hours look & behavior)
            const weekend = isWeekend(args?.cell?.start);
            if (weekend && !weekendsAreBusiness) {
                p.cssClass = appendClass(p.cssClass, "weekview_cell_weekend");
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
            }

            // Off-hours shading from org business hours (if provided)
            const within = isWithinBusinessHoursLocal(args?.cell?.start, args?.cell?.end, businessHours);
            if (within === false) {
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
            }

            // BUSINESS odd-hour readability (skip for OFF-hours & weekends)
            const isOff = weekend && !weekendsAreBusiness ? true : within === false;
            const start = args?.cell?.start;
            if (!isOff && start && typeof start.toString === "function") {
                const hour = Number(start.toString("H")); // 0..23
                if (hour % 2 === 1) {
                    p.cssClass = appendClass(p.cssClass, "weekview_cell_hour_odd");
                    if (!p.backColor) {
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
    /** When true, weekends follow business hours. Default: false (treat as off-hours). */
    weekendsAreBusiness?: boolean;
}) {
    const { businessHours, weekendsAreBusiness = false } = opts;

    return (args: any) => {
        try {
            const p = cellProps(args);

            // Weekend handling (default: OFF-hours)
            const weekend = isWeekend(args?.cell?.start);
            if (weekend && !weekendsAreBusiness) {
                p.cssClass = appendClass(p.cssClass, "weekview_cell_weekend");
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
            }

            // Off-hours from org hours
            const within = isWithinBusinessHoursLocal(args?.cell?.start, args?.cell?.end, businessHours);
            if (within === false) {
                p.cssClass = appendClass(p.cssClass, "offhours-cell");
            }
        } catch {
            /* no-op */
        }
    };
}
