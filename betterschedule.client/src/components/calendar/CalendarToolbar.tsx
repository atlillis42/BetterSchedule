import { useEffect, useMemo, useState } from "react";
import type { ViewMode } from "@/types/calendarView";

/**
 * Toolbar for the calendar view.
 *
 * @remarks
 * Fixed-height layout: view tabs (left) and a 12h digital clock (right).
 * - Week tab is highlighted for both "Week" and "WorkWeek".
 * - Business-hours toggle removed (we default to BusinessHours in Calendar.tsx).
 * - Availability overlay and Today button remain removed from UI.
 */
export default function CalendarToolbar(props: {
    /** Current calendar view mode. */
    view: ViewMode;
    /** Handler to set the active calendar view. */
    onSetView: (view: ViewMode) => void;
    /** IANA timezone label (e.g., "America/New_York"). */
    tzLabel: string;

    // -- Deprecated (retained for compatibility; not rendered) --
    /** @deprecated */
    onToday?: () => void;
    /** @deprecated */
    showOverlaySelector?: boolean;
    /** @deprecated */
    providers?: Array<{ id: string; name: string }>;
    /** @deprecated */
    overlayProviderId?: string;
    /** @deprecated */
    onOverlayChange?: (id?: string) => void;
}) {
    const { view, onSetView, tzLabel } = props;

    const weekTabActive = view === "Week" || view === "WorkWeek";

    // 12-hour clock in the toolbar (timezone-aware)
    const { timeText, tzAbbrev } = useZonedClock(tzLabel);

    // Pill-style tab buttons; keep legacy "selected" class too.
    const tabClass = (active: boolean) =>
        [
            "px-3 py-1.5 rounded-xl text-xs font-medium transition border",
            active
                ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-500"
                : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400",
        ].join(" ");

    return (
        <div className="calendar-toolbar flex items-center gap-3 px-2 border-b bg-gray-100 h-16">
            {/* VIEW TABS */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onSetView("Day")}
                    className={[tabClass(view === "Day"), view === "Day" ? "selected" : ""].join(" ")}
                >
                    Day
                </button>
                <button
                    onClick={() => onSetView("Week")}
                    className={[tabClass(weekTabActive), weekTabActive ? "selected" : ""].join(" ")}
                >
                    Week
                </button>
                <button
                    onClick={() => onSetView("Month")}
                    className={[tabClass(view === "Month"), view === "Month" ? "selected" : ""].join(" ")}
                >
                    Month
                </button>
                <button
                    onClick={() => onSetView("Resources")}
                    className={[tabClass(view === "Resources"), view === "Resources" ? "selected" : ""].join(" ")}
                >
                    Resources
                </button>
            </div>

            {/* RIGHT: 12-hour digital clock with zone badge */}
            <div className="ml-auto flex items-center gap-2">
                <span className="font-mono text-sm tracking-widest tabular-nums">{timeText}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-white">
                    {tzAbbrev}
                </span>
            </div>
        </div>
    );
}

/**
 * Hook: timezone-aware 12-hour clock with short zone badge (e.g., EST/EDT).
 * Updates every second.
 */
function useZonedClock(timeZone: string): { timeText: string; tzAbbrev: string } {
    const [now, setNow] = useState<Date>(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const formatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone,
            }),
        [timeZone]
    );

    const zoneFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                timeZone,
                timeZoneName: "short",
            }),
        [timeZone]
    );

    const timeText = useMemo(() => formatter.format(now), [formatter, now]);

    const tzAbbrev = useMemo(() => {
        const str = zoneFormatter.format(now); // e.g., "10/03/2025, 5:23:05 PM EDT"
        const match = str.match(/\b([A-Z]{2,4})\b/);
        return match?.[1] ?? "ET";
    }, [zoneFormatter, now]);

    return { timeText, tzAbbrev };
}
