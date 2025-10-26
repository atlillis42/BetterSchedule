import React, { useEffect, useMemo, useRef, useState } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { ViewMode } from "@/types/calendarView";
import { formatResourcesDayLabel } from "@/utilities/calendarDisplay/formatWeekHeader";
import { useTheme } from "@/components/theme/ThemeProvider";

type EventStyle = "tinted" | "bar";

export default function CalendarLegend(props: {
    view: ViewMode;
    onSetView: (view: ViewMode) => void;
    resourcesDayLabel?: string;
    eventStyle: EventStyle;
    onToggleEventStyle: (next: EventStyle) => void;
}) {
    const { view, onSetView, resourcesDayLabel, eventStyle, onToggleEventStyle } = props;

    const isWeekly = view === "Week" || view === "WorkWeek";
    const weekendsShown = view === "Week";
    const isResources = view === "Resources";
    const isMonth = view === "Month";

    const monthTodayLabel = useMemo(() => formatResourcesDayLabel(DayPilot.Date.today()), []);

    return (
        <div
            className="
        ml-4 flex items-center gap-3 text-xs p-2 border-b bg-white text-slate-700
        dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200
      "
        >
            {/* Status keys */}
            <LegendDot color="#3b82f6" label="Booked" />
            <LegendDot color="#10b981" label="Completed" />
            <LegendDot color="#f59e0b" label="Canceled" />
            <LegendDot color="#ef4444" label="No-Show / Late Cancel" />

            <div className="ml-auto flex items-center gap-2">
                {/* Compact Display Menu */}
                <DisplayMenu
                    view={view}
                    weekendsShown={weekendsShown}
                    onToggleWeekends={() => onSetView(weekendsShown ? "WorkWeek" : "Week")}
                    eventStyle={eventStyle}
                    onToggleEventStyle={onToggleEventStyle}
                />

                {(isResources || isMonth) && (
                    <span
                        className="
              inline-flex items-center gap-2 px-3 py-1 rounded-full border
              border-slate-200 bg-slate-50 text-slate-700
              dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100
              text-[11px] font-medium
            "
                        title={isResources ? "Viewing day (Resources view)" : "Today"}
                    >
                        <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full" style={{ background: "#3c78d8" }} />
                        {isResources ? (resourcesDayLabel ?? "") : monthTodayLabel}
                    </span>
                )}
            </div>
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
            <span>{label}</span>
        </div>
    );
}

/* -------- Display menu (Weekends • Theme • Event Style) -------- */
function DisplayMenu(props: {
    view: ViewMode;
    weekendsShown: boolean;
    onToggleWeekends: () => void;
    eventStyle: "tinted" | "bar";
    onToggleEventStyle: (next: "tinted" | "bar") => void;
}) {
    const { view, weekendsShown, onToggleWeekends, eventStyle, onToggleEventStyle } = props;
    const isWeekly = view === "Week" || view === "WorkWeek";

    // Theme control (no Auto)
    const { theme, setTheme } = useTheme(); // expects "light" | "dark" | "system"; we’ll only use light/dark
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ref.current) return;
            if (ref.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("click", onDocClick);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", onDocClick);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs
          bg-white border-slate-200 hover:bg-blue-50 text-slate-700
          dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-600
        "
                title="Display options"
            >
                <SlidersIcon className="w-4 h-4" />
                Display
            </button>

            {open && (
                <div
                    role="menu"
                    className="
            absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-white text-slate-800 shadow-xl
            border-slate-200
            dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700
          "
                >
                    {/* Weekends */}
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Calendar</div>
                        <label className={`flex items-center justify-between text-sm ${!isWeekly ? "opacity-50" : ""}`}>
                            <span>Show weekends</span>
                            <input
                                type="checkbox"
                                className="accent-blue-600"
                                checked={weekendsShown}
                                onChange={onToggleWeekends}
                                disabled={!isWeekly}
                            />
                        </label>
                    </div>

                    {/* Light/Dark Theme */}
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Theme</div>
                        <SegmentedRow
                            value={theme === "dark" ? "dark" : "light"}
                            onChange={(v) => setTheme(v as "light" | "dark")}
                            options={[
                                { value: "light", label: "Light" },
                                { value: "dark", label: "Dark" },
                            ]}
                        />
                    </div>

                    {/* Event Style */}
                    <div className="px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Event style</div>
                        <SegmentedRow
                            value={eventStyle}
                            onChange={(v) => onToggleEventStyle(v as "tinted" | "bar")}
                            options={[
                                { value: "tinted", label: "Tinted" },
                                { value: "bar", label: "Bar" },
                            ]}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function SegmentedRow(props: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    const { value, onChange, options } = props;
    return (
        <div
            className="
        inline-flex items-center rounded-lg border overflow-hidden text-xs
        border-slate-200 bg-white
        dark:border-slate-600 dark:bg-slate-700
      "
            role="tablist"
        >
            {options.map((opt) => {
                const active = value === opt.value;
                const base = "px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
                const cls = active
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "text-slate-700 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-slate-600";
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-pressed={active}
                        className={`${base} ${cls}`}
                        onClick={() => onChange(opt.value)}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function SlidersIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
    );
}
