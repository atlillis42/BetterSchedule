import React from "react";

export type CalendarView = "day" | "resources" | "week" | "workweek" | "month";

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

    const btn = (key: CalendarView, label: string) => (
        <button
            key={key}
            className={`px-3 py-2 rounded-md text-sm border border-transparent ${value === key ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                }`}
            onClick={() => onChange(key)}
        >
            {label}
        </button>
    );

    const items: Array<[CalendarView, string]> = [
        ["day", "Day"],
        ["resources", "Resources"],
        ["week", "Week"],
        ["month", "Month"],
    ];

    return (
        <div className="relative" ref={ref}>
            {/* Desktop/tablet buttons */}
            <div className="hidden sm:flex items-center gap-2">
                {items.map(([k, l]) => btn(k, l))}
            </div>

            {/* Mobile ellipsis */}
            <div className="sm:hidden">
                <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="px-3 py-2 rounded-md bg-blue-100 text-blue-900 border border-blue-200"
                    title="Change view"
                >
                    …
                </button>
                {open && (
                    <div
                        role="menu"
                        className="absolute z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-xl"
                    >
                        <ul className="py-1 text-sm">
                            {items.map(([k, l]) => (
                                <li key={k}>
                                    <button
                                        role="menuitem"
                                        onClick={() => {
                                            onChange(k);
                                            setOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${value === k ? "font-semibold" : ""
                                            }`}
                                    >
                                        {l}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
