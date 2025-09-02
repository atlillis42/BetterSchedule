import type { ViewMode } from "@/types/calendarView";

/**
 * Toolbar with view switching, Today shortcut, timezone label, and optional overlay selector.
 */
export default function CalendarToolbar(props: {
    view: ViewMode;
    onSetView: (view: ViewMode) => void;
    onToday: () => void;
    tzLabel: string;
    showOverlaySelector: boolean;
    providers: Array<{ id: string; name: string }>;
    overlayProviderId?: string;
    onOverlayChange: (id?: string) => void;
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
    } = props;

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

            <span className="ml-auto text-xs text-gray-600">All times in {tzLabel}</span>
        </div>
    );
}
