import { useMemo } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { createBeforeEventRender } from "@/adapters/daypilot/beforeEventRenderFactory";

/** Safe ticks getter for DayPilot.Date or ISO/string. */
function ticks(v: any): number | undefined {
    if (!v) return undefined;
    try {
        if (typeof v.getTime === "function") return v.getTime();
        return new DayPilot.Date(v).getTime();
    } catch {
        return undefined;
    }
}

/**
 * Calendar rendering callbacks.
 * - Adds a "cell-now" class to the cell containing the current time.
 * - Event styling still delegated to your existing factory.
 */
export function useEventStyling() {
    const beforeCellRender = useMemo(() => {
        return (args: any) => {
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
    }, []);

    // Scheduler variant (same "now" highlight logic)
    const beforeSchedulerCellRender = beforeCellRender;

    const beforeEventRender = useMemo(() => createBeforeEventRender(), []);

    return { beforeCellRender, beforeSchedulerCellRender, beforeEventRender };
}
