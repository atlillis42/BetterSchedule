import type { ViewMode } from "@/types/calendarView";

/**
 * Toolbar for the calendar view.
 *
 * @remarks
 * Provides quick view switching (Day/Week/Month/Resources), a Today shortcut,
 * timezone display, an optional provider availability overlay selector, and
 * toggles for hiding non-business hours and switching between Week and WorkWeek.
 */
export default function CalendarToolbar(props: {
    /** Current calendar view mode. */
    view: ViewMode;
    /** Handler to set the active calendar view. */
    onSetView: (view: ViewMode) => void;
    /** Handler to jump to today. */
    onToday: () => void;
    /** Display label for the active timezone. */
    tzLabel: string;
    /** When true, shows the provider overlay selector. */
    showOverlaySelector: boolean;
    /** List of providers for overlay selection. */
    providers: Array<{ id: string; name: string }>;
    /** Currently selected provider id for overlay, if any. */
    overlayProviderId?: string;
    /** Handler to change the overlay provider id. */
    onOverlayChange: (id?: string) => void;
    /** Whether off-hours are hidden (rows omitted vs. reachable via scroll). */
    hideOffHours: boolean;
    /** Handler to toggle off-hours visibility. */
    onToggleOffHours: (value: boolean) => void;
}) {
    const {
        view,
        onSetView,
        onToday,
        tzLabel,
        showOverlaySelector,
        providers,
        overlayProviderId,
        onOverlayChange,
        hideOffHours,
        onToggleOffHours,
    } = props;

    const isWorkWeek = view === "WorkWeek";

    return (
        <div className="calendar-toolbar flex items-center gap-2 p-2 border-b bg-gray-100">
            <button onClick={() => onSetView("Day")} className={view === "Day" ? "selected" : ""}>
                Day
            </button>
            <button onClick={() => onSetView("Week")} className={view === "Week" ? "selected" : ""}>
                Week
            </button>
            <button onClick={() => onSetView("Month")} className={view === "Month" ? "selected" : ""}>
                Month
            </button>
            <button onClick={() => onSetView("Resources")} className={view === "Resources" ? "selected" : ""}>
                Resources
            </button>
            <button onClick={onToday} className="standalone">
                Today
            </button>

            {showOverlaySelector && (
                <div className="ml-4 flex items-center gap-2">
                    <span className="text-xs text-gray-600">Availability overlay:</span>
                    <select
                        className="border rounded px-2 py-1 text-sm"
                        value={overlayProviderId ?? ""}
                        onChange={(e) => onOverlayChange(e.target.value || undefined)}
                    >
                        <option value="">(none)</option>
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="ml-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                    <input
                        type="checkbox"
                        checked={hideOffHours}
                        onChange={(e) => onToggleOffHours(e.target.checked)}
                    />
                    Hide non-business hours
                </label>

                {(view === "Week" || view === "WorkWeek") && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                        <input
                            type="checkbox"
                            checked={isWorkWeek}
                            onChange={(e) => onSetView(e.target.checked ? "WorkWeek" : "Week")}
                        />
                        Work week (Mon–Fri)
                    </label>
                )}
            </div>

            <span className="ml-auto text-xs text-gray-600">All times in {tzLabel}</span>
        </div>
    );
}