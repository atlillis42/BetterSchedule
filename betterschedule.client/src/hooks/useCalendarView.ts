import { useEffect, useMemo, useRef, useState } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { getOrgSettings, type OrgSettingsDto } from "@/api/org-settings-api";
import type { ViewMode } from "@/types/calendarView";

/**
 * Manages calendar view state (view mode, start date) and loads organization settings.
 * Always defaults to WorkWeek. If the org default is "Week", coerce it to "WorkWeek".
 * Other org defaults (Day/Month/Resources) are respected.
 */
export function useCalendarView() {
    const [org, setOrg] = useState<OrgSettingsDto | null>(null);
    const [view, setView] = useState<ViewMode>("WorkWeek"); // hard default to WorkWeek
    const [startDate, setStartDate] = useState(DayPilot.Date.today());
    const appliedDefaultViewRef = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                const s = await getOrgSettings();
                setOrg(s);
                if (!appliedDefaultViewRef.current && s?.defaultView) {
                    const v = (s.defaultView as ViewMode) || "WorkWeek";
                    const coerced: ViewMode = v === "Week" ? "WorkWeek" : v;
                    setView(coerced);
                    appliedDefaultViewRef.current = true;
                }
            } catch (err: any) {
                if (err?.response?.status !== 403) {
                    console.warn("Org settings load failed", err);
                }
            }
        })();
    }, []);

    const tzLabel = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return "local time";
        }
    }, []);

    const goToday = () => setStartDate(DayPilot.Date.today());

    return { org, view, setView, startDate, setStartDate, tzLabel, goToday };
}
