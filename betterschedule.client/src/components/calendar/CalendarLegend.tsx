import { useMemo } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { ViewMode } from "@/types/calendarView";
import { formatResourcesDayLabel } from "@/utilities/calendarDisplay/formatWeekHeader";

/**
 * CalendarLegend
 * -----------------------------------------------------------------------------
 * - Shows reservation status colors.
 * - Weekly context: "Show/Hide Weekends" toggle on the right.
 * - Resources context: compact "viewing day" badge on the right.
 * - Month context: compact "today" badge on the right.
 */

export default function CalendarLegend(props: {
    view: ViewMode;
    onSetView: (view: ViewMode) => void;
    resourcesDayLabel?: string;
}) {
    const { view, onSetView, resourcesDayLabel } = props;

    const isWeekly = view === "Week" || view === "WorkWeek";
    const weekendsShown = view === "Week";
    const isResources = view === "Resources";
    const isMonth = view === "Month";

    const monthTodayLabel = useMemo(() => formatResourcesDayLabel(DayPilot.Date.today()), []);

    return (
        <div className="ml-4 flex items-center gap-3 text-xs p-2 border-b bg-white">
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
                <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#10b981" }} />
                <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
                <span>Canceled</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#ef4444" }} />
                <span>No-Show / Late Cancel</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                {isWeekly && (
                    <ToggleLabeledSubtle
                        id="toggle-weekends"
                        checked={weekendsShown}
                        onText="Hide Weekends"
                        offText="Show Weekends"
                        onChange={(next) => onSetView(next ? "Week" : "WorkWeek")}
                    />
                )}

                {(isResources || isMonth) && (
                    <span
                        className={[
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
                            "border-slate-200 bg-slate-50 text-slate-700",
                            "text-[11px] font-medium",
                        ].join(" ")}
                        title={isResources ? "Viewing day (Resources view)" : "Today"}
                    >
                        <span
                            aria-hidden="true"
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: "#3c78d8" }}
                        />
                        {isResources ? (resourcesDayLabel ?? "") : monthTodayLabel}
                    </span>
                )}
            </div>
        </div>
    );
}

function ToggleLabeledSubtle(props: {
    id?: string;
    checked: boolean;
    onText: string;
    offText: string;
    onChange: (next: boolean) => void;
}) {
    const { id, checked, onText, offText, onChange } = props;

    return (
        <label className="group inline-flex items-center cursor-pointer select-none">
            <input
                id={id}
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span
                aria-hidden="true"
                className={[
                    "relative inline-flex items-center justify-center",
                    "px-3 py-1 rounded-full border text-[11px] font-medium transition-colors",
                    "min-w-[8.5rem]",
                    "border-slate-200 text-slate-700 bg-slate-50",
                    "peer-checked:bg-blue-100 peer-checked:text-blue-900 peer-checked:border-blue-200",
                    "group-focus-within:ring-2 group-focus-within:ring-blue-400 group-focus-within:ring-offset-1",
                ].join(" ")}
            >
                <span className={[checked ? "opacity-100" : "opacity-0", "transition-opacity duration-150 absolute"].join(" ")}>
                    {onText}
                </span>
                <span className={[checked ? "opacity-0" : "opacity-100", "transition-opacity duration-150"].join(" ")}>
                    {offText}
                </span>
            </span>
        </label>
    );
}
