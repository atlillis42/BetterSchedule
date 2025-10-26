import React from "react";
import { DayPilotNavigator } from "@daypilot/daypilot-lite-react";
import { navigatorTheme } from "@/domain/calendar/daypilotThemes";
import type { UiEvent } from "@/types";
import type { ViewMode } from "@/types/calendarView";

const REQUEST_NAV_TOGGLE_EVT = "bs:requestNavToggle";

export default function CalendarNavigatorPane(props: {
    view: ViewMode;
    visibleEvents: UiEvent[];
    onDateChange: (date: any) => void;
}) {
    const { view, visibleEvents, onDateChange } = props;

    const [mobileOpen, setMobileOpen] = React.useState(false);
    const drawerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const handler = () => setMobileOpen((v) => !v);
        window.addEventListener(REQUEST_NAV_TOGGLE_EVT, handler);
        return () => window.removeEventListener(REQUEST_NAV_TOGGLE_EVT, handler);
    }, []);

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
        window.addEventListener("keydown", onKey);

        const mq = window.matchMedia("(min-width: 1024px)");
        const onResize = (e: MediaQueryListEvent) => {
            if (e.matches) setMobileOpen(false);
        };
        mq.addEventListener("change", onResize);

        return () => {
            window.removeEventListener("keydown", onKey);
            mq.removeEventListener("change", onResize);
        };
    }, []);

    const onBackdropClick = (e: React.MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
            setMobileOpen(false);
        }
    };

    const Navigator = (
        <DayPilotNavigator
            theme={navigatorTheme()}
            selectMode={view === "Month" ? "Month" : "Day"}
            showMonths={3}
            skipMonths={3}
            onTimeRangeSelected={(args) => {
                onDateChange(args.day);
                setMobileOpen(false);
            }}
            events={visibleEvents}
        />
    );

    return (
        <>
            {/* Desktop sidebar */}
            <div
                className="
                    calendar-sidebar hidden lg:block w-64
                    bg-white border-r border-slate-200 shadow-sm
                    dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100
                "
            >
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
                    <div className="fixed inset-0 bg-black/40" />

                    {/* Panel */}
                    <div
                        ref={drawerRef}
                        className="
                            relative h-full w-80 max-w-[90vw]
                            bg-white border-r border-slate-200 shadow-xl
                            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100
                            animate-[slideIn_0.18s_ease-out]
                        "
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                            <div className="text-sm font-semibold">Navigator</div>
                            <button
                                className="
                                    text-sm px-2 py-1 rounded
                                    hover:bg-slate-100 dark:hover:bg-slate-700
                                    transition-colors
                                "
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
