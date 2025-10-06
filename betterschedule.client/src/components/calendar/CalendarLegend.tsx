import type { ViewMode } from "@/types/calendarView";

/**
 * Legend for reservation status colors + a compact weekend toggle on the far right.
 *
 * Action semantics:
 * - When current view is WorkWeek (no weekends), the button says "Show Weekends".
 * - When current view is Week (with weekends), the button says "Hide Weekends".
 *
 * Implementation detail:
 * - We use a single checkbox with dynamic label. `checked` reflects "Week" (weekends shown).
 *   onText applies when checked; offText applies when unchecked.
 */
export default function CalendarLegend(props: {
    view: ViewMode;
    onSetView: (view: ViewMode) => void;
}) {
    const { view, onSetView } = props;
    const isWeekly = view === "Week" || view === "WorkWeek";
    const weekendsShown = view === "Week"; // checked = Week (weekends visible)

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
                <span>No-Show</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#9ca3af" }} />
                <span>Canceled</span>
            </div>

            {/* Far right: small, subtle weekend action toggle (only in weekly context) */}
            {isWeekly && (
                <div className="ml-auto">
                    <ToggleLabeledSubtle
                        id="toggle-weekends"
                        checked={weekendsShown}
                        onText="Hide Weekends"   /* label when checked (Week) */
                        offText="Show Weekends"  /* label when unchecked (WorkWeek) */
                        onChange={(next) => onSetView(next ? "Week" : "WorkWeek")}
                    />
                </div>
            )}
        </div>
    );
}

/** Small, subtle labeled pill toggle (light gray-blue), used on the legend. */
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
                {/* Checked label (Week) */}
                <span className={[checked ? "opacity-100" : "opacity-0", "transition-opacity duration-150 absolute"].join(" ")}>
                    {onText}
                </span>
                {/* Unchecked label (WorkWeek) */}
                <span className={[checked ? "opacity-0" : "opacity-100", "transition-opacity duration-150"].join(" ")}>
                    {offText}
                </span>
            </span>
        </label>
    );
}
