import { useEffect, useMemo, useRef, useState } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { getOrgSettings, type OrgSettingsDto } from "@/api/org-settings-api";
import type { ViewMode } from "@/types/calendarView";
import { getStartDateForCalendar } from "@/utilities/calendarDisplay/getVisibleRange";

/**
 * Manages calendar view state (view mode, anchor date) and loads organization settings.
 * - Defaults to WorkWeek; coerces org "Week" to "WorkWeek" for a work-focused default.
 * - Exposes `calendarStartDate`: the correct DayPilot startDate for the current view,
 *   ensuring the rendered strip aligns with our data-fetching window.
 */
export function useCalendarView() {
    const [org, setOrg] = useState<OrgSettingsDto | null>(null);
    const [view, setView] = useState<ViewMode>("WorkWeek");
    const [startDate, setStartDate] = useState(DayPilot.Date.today()); // anchor
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

    // Timezone label (unchanged)
    const tzLabel = useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return "local time";
        }
    }, []);

    // What DayPilot should receive as startDate (keeps UI window aligned with data)
    const calendarStartDate = useMemo(
        () => getStartDateForCalendar(view, startDate),
        [view, startDate]
    );

    const goToday = () => setStartDate(DayPilot.Date.today());

    return { org, view, setView, startDate, setStartDate, calendarStartDate, tzLabel, goToday };
}
