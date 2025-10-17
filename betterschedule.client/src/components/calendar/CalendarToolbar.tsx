import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { listOrgs, type OrganizationLite } from "@/api/organizations-api";
import type { ViewMode } from "@/types/calendarView";

/**
 * CalendarToolbar
 *
 * Renders:
 * - Left: View tabs (Day, Resources, Week, Month).
 * - Center: Organization display name and "Viewing as {role}" (role priority: Manager > Provider > Client).
 * - Right: Timezone-aware 12-hour clock with a short zone badge.
 * @public
 */
export default function CalendarToolbar(props: {
    /** Current calendar view mode. */
    view: ViewMode;
    /** Handler to set the active calendar view. */
    onSetView: (view: ViewMode) => void;
    /** IANA timezone label (e.g., "America/New_York"). */
    tzLabel: string;
}) {
    const { view, onSetView, tzLabel } = props;

    // Role + organization context
    const { isManager, isProvider, isClient, organizationId } = useAuth();

    /** Highest-access role label (Manager > Provider > Client). */
    const viewingAs = useMemo(() => {
        if (isManager) return "Manager";
        if (isProvider) return "Provider";
        if (isClient) return "Client";
        return undefined;
    }, [isManager, isProvider, isClient]);

    // Resolve org display name by id (local cache + listOrgs fallback).
    const organizationName = useOrganizationDisplayName(organizationId ?? undefined);

    // Week and WorkWeek share the "Week" tab highlight
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
        <div className="calendar-toolbar relative flex items-center gap-3 px-2 border-b bg-gray-100 h-16">
            {/* VIEW TABS (left) */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onSetView("Day")}
                    className={[tabClass(view === "Day"), view === "Day" ? "selected" : ""].join(" ")}
                    aria-current={view === "Day" ? "page" : undefined}
                >
                    Day
                </button>

                <button
                    onClick={() => onSetView("Resources")}
                    className={[tabClass(view === "Resources"), view === "Resources" ? "selected" : ""].join(" ")}
                    aria-current={view === "Resources" ? "page" : undefined}
                >
                    Resources
                </button>

                <button
                    onClick={() => onSetView("Week")}
                    className={[tabClass(weekTabActive), weekTabActive ? "selected" : ""].join(" ")}
                    aria-current={weekTabActive ? "page" : undefined}
                >
                    Week
                </button>

                <button
                    onClick={() => onSetView("Month")}
                    className={[tabClass(view === "Month"), view === "Month" ? "selected" : ""].join(" ")}
                    aria-current={view === "Month" ? "page" : undefined}
                >
                    Month
                </button>
            </div>

            {/* CENTER: Organization + Viewing as (absolutely centered) */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center leading-tight">
                {organizationName && (
                    <div
                        className="text-sm font-semibold text-slate-800 max-w-[36ch] truncate"
                        title={organizationName}
                        aria-label={`Organization: ${organizationName}`}
                    >
                        {organizationName}
                    </div>
                )}
                {viewingAs && (
                    <div className="text-[11px] text-slate-600">
                        Viewing as <span className="font-medium">{viewingAs}</span>
                    </div>
                )}
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
 * Module-local cache of orgId -> display name.
 * Keeps the toolbar from re-querying for the same id.
 */
const orgNameCache = new Map<string, string>();

/**
 * Resolves an organization display name using the organizations API.
 * Directly uses the `name` field from `OrganizationLite`.
 *
 * @param organizationId Organization identifier to resolve.
 * @returns The display name, or `undefined` if unknown/not scoped.
 * @remarks
 * Uses `listOrgs(undefined, 200)` and filters client-side to locate the matching id.
 * Suitable for demo-size data. Consider a `GET /orgs/{id}` endpoint later for O(1).
 */
function useOrganizationDisplayName(organizationId?: string): string | undefined {
    const [name, setName] = useState<string | undefined>(() =>
        organizationId ? orgNameCache.get(organizationId) : undefined
    );

    useEffect(() => {
        let cancelled = false;

        async function run(): Promise<void> {
            if (!organizationId) {
                setName(undefined);
                return;
            }

            // Cache hit
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

/**
 * Hook: timezone-aware 12-hour clock with short zone badge (e.g., "EDT").
 * Updates every second.
 *
 * @param timeZone IANA timezone identifier.
 * @returns Formatted time text and a short zone label.
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

    // Example formatted string might be "10/03/2025, 5:23:05 PM EDT"
    const tzAbbrev = useMemo(() => {
        const str = zoneFormatter.format(now);
        const match = str.match(/\b([A-Z]{2,4})\b/);
        return match?.[1] ?? "ET";
    }, [zoneFormatter, now]);

    return { timeText, tzAbbrev };
}
