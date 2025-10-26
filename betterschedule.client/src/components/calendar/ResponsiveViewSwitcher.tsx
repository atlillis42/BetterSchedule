import React from "react";

export type CalendarView = "day" | "resources" | "week" | "workweek" | "month";

/**
 * ResponsiveViewSwitcher
 *
 * Desktop/tablet: inline buttons.
 * Mobile: compact ellipsis menu.
 */
export const ResponsiveViewSwitcher: React.FC<{
    value: CalendarView;
    onChange: (v: CalendarView) => void;
}> = ({ value, onChange }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!ref.current) return;
            if (ref.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("click", onClick);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", onClick);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    const btn = (key: CalendarView, label: string) => {
        const isActive = value === key;
        const base =
            "px-3 py-2 rounded-md text-sm border transition-all outline-none " +
            "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 " +
            "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 " +
            "dark:focus-visible:ring-offset-slate-800";
        const activeCls = "bg-blue-600 text-white border-blue-600";
        const inactiveCls =
            "bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200 " +
            "dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-600";

        return (
            <button
                key={key}
                type="button"
                className={[base, isActive ? activeCls : inactiveCls].join(" ")}
                onClick={() => onChange(key)}
                role="tab"
                aria-selected={isActive}
                aria-pressed={isActive}
                aria-current={isActive ? "page" : undefined}
                title={`Switch to ${label} view`}
            >
                {label}
            </button>
        );
    };

    const items: Array<[CalendarView, string]> = [
        ["day", "Day"],
        ["resources", "Resources"],
        ["week", "Week"],
        ["month", "Month"],
    ];

    return (
        <div className="relative" ref={ref}>
            {/* Desktop/tablet buttons */}
            <div className="hidden sm:flex items-center gap-2" role="tablist" aria-label="Calendar view">
                {items.map(([k, l]) => btn(k, l))}
            </div>

            {/* Mobile ellipsis */}
            <div className="sm:hidden">
                <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="px-3 py-2 rounded-md border bg-blue-100 text-blue-900 border-blue-200 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    title="Change view"
                >
                    …
                </button>
                {open && (
                    <div
                        role="menu"
                        className="
                            absolute z-50 mt-2 w-44 rounded-lg border
                            border-slate-200 bg-white shadow-xl
                            dark:border-slate-700 dark:bg-slate-800
                        "
                    >
                        <ul className="py-1 text-sm">
                            {items.map(([k, l]) => {
                                const isActive = value === k;
                                return (
                                    <li key={k}>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                onChange(k);
                                                setOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${isActive ? "font-semibold" : ""}`}
                                        >
                                            {l}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
