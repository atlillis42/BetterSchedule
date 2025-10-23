import React from "react";
import { DayPilotNavigator } from "@daypilot/daypilot-lite-react";
import { navigatorTheme } from "@/domain/calendar/daypilotThemes";
import type { UiEvent } from "@/types";
import type { ViewMode } from "@/types/calendarView";

/** Event name triggered by TopNav to toggle the mobile navigator drawer */
const REQUEST_NAV_TOGGLE_EVT = "bs:requestNavToggle";

/**
 * Date navigator pane.
 * - Desktop (>= lg): fixed left sidebar.
 * - Mobile/Tablet (< lg): hidden by default; opens as a slide-over drawer when TopNav's "Navigator" is clicked.
 */
export default function CalendarNavigatorPane(props: {
    view: ViewMode;
    visibleEvents: UiEvent[];
    onDateChange: (date: any) => void;
}) {
    const { view, visibleEvents, onDateChange } = props;

    const [mobileOpen, setMobileOpen] = React.useState(false);
    const drawerRef = React.useRef<HTMLDivElement | null>(null);

    // Toggle via global event from TopNav
    React.useEffect(() => {
        const handler = () => setMobileOpen((v) => !v);
        window.addEventListener(REQUEST_NAV_TOGGLE_EVT, handler);
        return () => window.removeEventListener(REQUEST_NAV_TOGGLE_EVT, handler);
    }, []);

    // Close drawer on ESC or when viewport grows to >= lg (to avoid stale open state)
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
        window.addEventListener("keydown", onKey);

        const mq = window.matchMedia("(min-width: 1024px)"); // lg breakpoint
        const onResize = (e: MediaQueryListEvent) => {
            if (e.matches) setMobileOpen(false);
        };
        mq.addEventListener("change", onResize);

        return () => {
            window.removeEventListener("keydown", onKey);
            mq.removeEventListener("change", onResize);
        };
    }, []);

    // Close when clicking backdrop (outside panel)
    const onBackdropClick = (e: React.MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
            setMobileOpen(false);
        }
    };

    // Shared Navigator JSX
    const Navigator = (
        <DayPilotNavigator
            theme={navigatorTheme()}
            selectMode={view === "Month" ? "Month" : "Day"}
            showMonths={3}
            skipMonths={3}
            onTimeRangeSelected={(args) => {
                onDateChange(args.day);
                // Close drawer after pick on mobile
                setMobileOpen(false);
            }}
            events={visibleEvents}
        />
    );

    return (
        <>
            {/* Desktop sidebar */}
            <div className="calendar-sidebar hidden lg:block w-64 bg-white shadow-md border-r border-gray-200">
                {Navigator}
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 flex"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={onBackdropClick}
                >
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/30" />

                    {/* Panel */}
                    <div
                        ref={drawerRef}
                        className="relative h-full w-80 max-w-[90vw] bg-white shadow-xl border-r border-gray-200 animate-[slideIn_0.18s_ease-out]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b">
                            <div className="text-sm font-semibold">Navigator</div>
                            <button
                                className="text-sm px-2 py-1 rounded hover:bg-slate-100"
                                onClick={() => setMobileOpen(false)}
                                aria-label="Close navigator"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-2">{Navigator}</div>
                    </div>
                </div>
            )}
        </>
    );
}
