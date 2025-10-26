import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { listOrgs, type OrganizationLite } from "@/api/organizations-api";
import type { ViewMode } from "@/types/calendarView";

/** Cross-component event names shared with TopNav */
const VIEW_CHANGED_EVT = "bs:viewChanged";
const REQUEST_VIEW_CHANGE_EVT = "bs:requestViewChange";

type SwitcherView = "Day" | "Resources" | "Week" | "Month";

export default function CalendarToolbar(props: {
    view: ViewMode;
    onSetView: (view: ViewMode) => void;
    tzLabel: string;
}) {
    const { view, onSetView, tzLabel } = props;

    // Role + organization context
    const { isManager, isProvider, isClient, organizationId, isDemo } = useAuth() as {
        isManager: boolean;
        isProvider: boolean;
        isClient: boolean;
        organizationId?: string | null;
        isDemo?: boolean;
    };

    const viewingAs = useMemo(() => {
        if (isManager) return "Manager";
        if (isProvider) return "Provider";
        if (isClient) return "Client";
        return undefined;
    }, [isManager, isProvider, isClient]);

    const baseOrgName = useOrganizationDisplayName(organizationId ?? undefined);
    const organizationName = isDemo ? "Demo Sandbox" : baseOrgName;

    const activeForSwitcher: SwitcherView = (view === "WorkWeek" ? "Week" : view) as SwitcherView;

    useEffect(() => {
        window.dispatchEvent(new CustomEvent(VIEW_CHANGED_EVT, { detail: activeForSwitcher }));
    }, [activeForSwitcher]);

    useEffect(() => {
        const handler = (e: Event) => {
            const target = (e as CustomEvent).detail as SwitcherView | undefined;
            if (!target) return;
            onSetView(target as unknown as ViewMode);
        };
        window.addEventListener(REQUEST_VIEW_CHANGE_EVT, handler as EventListener);
        return () => window.removeEventListener(REQUEST_VIEW_CHANGE_EVT, handler as EventListener);
    }, [onSetView]);

    return (
        <div
            className="
                calendar-toolbar relative flex items-center gap-3 px-2 border-b h-16
                bg-gray-100 border-slate-200
                dark:bg-slate-800 dark:border-slate-700
            "
            data-toolbar="modern"
        >
            {/* Desktop view switcher */}
            <DesktopViewSwitcher value={activeForSwitcher} onChange={(v) => onSetView(v as unknown as ViewMode)} />

            {/* Center: org + role */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center leading-tight">
                {organizationName && (
                    <div
                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-[36ch] truncate"
                        title={organizationName}
                        aria-label={`Organization: ${organizationName}`}
                    >
                        {organizationName}
                    </div>
                )}
                {viewingAs && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Viewing as <span className="font-medium">{viewingAs}</span>
                    </div>
                )}
            </div>

            {/* Right: Theme & Clock */}
            <div className="ml-auto flex items-center gap-2">
                <ZonedClock tzLabel={tzLabel} />
            </div>
        </div>
    );
}

const DesktopViewSwitcher: React.FC<{
    value: "Day" | "Resources" | "Week" | "Month";
    onChange: (v: "Day" | "Resources" | "Week" | "Month") => void;
}> = ({ value, onChange }) => {
    const items: Array<["Day" | "Resources" | "Week" | "Month", string]> = [
        ["Day", "Day"],
        ["Resources", "Resources"],
        ["Week", "Week"],
        ["Month", "Month"],
    ];

    const base =
        "relative px-3 py-1.5 rounded-xl text-xs font-medium border transition-all " +
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 " +
        "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 " +
        "dark:focus-visible:ring-offset-slate-800";

    const activeCls =
        "bg-blue-600 text-white border-blue-600 ring-1 ring-blue-500 pointer-events-none " +
        "dark:bg-blue-600 dark:border-blue-600 dark:ring-blue-400";

    const inactiveCls =
        // Light: white baseline; Dark: softened slate surfaces
        "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 " +
        "dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 " +
        "dark:hover:bg-slate-600 dark:hover:text-white dark:hover:border-slate-500";

    return (
        <div className="hidden lg:flex items-center gap-2" role="tablist" aria-label="Calendar view">
            {items.map(([k, label]) => {
                const isActive = value === k;
                return (
                    <button
                        key={k}
                        type="button"
                        onClick={() => onChange(k)}
                        className={`${base} ${isActive ? activeCls : inactiveCls}`}
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? "page" : undefined}
                        aria-pressed={isActive}
                        data-active={isActive || undefined}
                        title={`Switch to ${label} view`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

/* ---------- org name cache + resolver ---------- */
const orgNameCache = new Map<string, string>();

function useOrganizationDisplayName(organizationId?: string): string | undefined {
    const [name, setName] = useState<string | undefined>(() =>
        organizationId ? orgNameCache.get(organizationId) : undefined
    );

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!organizationId) {
                setName(undefined);
                return;
            }
            const cached = orgNameCache.get(organizationId);
            if (cached) {
                setName(cached);
                return;
            }
            try {
                const orgs: OrganizationLite[] = await listOrgs(undefined, 200);
                const match = orgs?.find((o) => o.id === organizationId);
                if (!cancelled) {
                    if (match?.name) {
                        orgNameCache.set(organizationId, match.name);
                        setName(match.name);
                    } else {
                        setName(undefined);
                    }
                }
            } catch {
                if (!cancelled) setName(undefined);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [organizationId]);

    return name;
}

/* ---------- clock ---------- */
function ZonedClock({ tzLabel }: { tzLabel: string }) {
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
                timeZone: tzLabel,
            }),
        [tzLabel]
    );

    const zoneFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                timeZone: tzLabel,
                timeZoneName: "short",
            }),
        [tzLabel]
    );

    const timeText = useMemo(() => formatter.format(now), [formatter, now]);

    const tzAbbrev = useMemo(() => {
        const str = zoneFormatter.format(now);
        const match = str.match(/\b([A-Z]{2,4})\b/);
        return match?.[1] ?? "ET";
    }, [zoneFormatter, now]);

    return (
        <>
            <span className="font-mono text-sm tracking-widest tabular-nums text-slate-900 dark:text-slate-100">
                {timeText}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-white">
                {tzAbbrev}
            </span>
        </>
    );
}
