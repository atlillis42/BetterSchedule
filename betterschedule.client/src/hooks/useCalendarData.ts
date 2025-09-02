import { useEffect, useState } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { CalendarResource, UiEvent } from "@/types";
import { fetchResources } from "@/services/resourcesService";
import { fetchEventsInRange } from "@/services/eventsService";
import { getProvidersOrDerive, type ProviderLite } from "@/services/providersService";
import { getVisibleRange } from "@/utilities/calendarDisplay/getVisibleRange";

/**
 * Loads resources, events, and provider list for the current view window.
 * @param startDate Current start date (local).
 * @param view Current calendar view mode.
 * @returns Resources, events, providers, and an explicit `refreshEvents`.
 */
export function useCalendarData(startDate: DayPilot.Date, view: "Day" | "Week" | "Month" | "Resources") {
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [providers, setProviders] = useState<ProviderLite[]>([]);

    async function refreshEvents() {
        const { start, end } = getVisibleRange(startDate, view);
        const all = await fetchEventsInRange(start, end);
        setEvents(all);
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);
                const [resList, eventList] = await Promise.all([fetchResources(), fetchEventsInRange(start, end)]);
                if (cancelled) return;
                setResources(resList);
                setEvents(eventList);
                const prov = await getProvidersOrDerive(eventList);
                if (!cancelled) setProviders(prov);
            } catch (err) {
                if (!cancelled) console.error("⛔ Calendar data load failed", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [startDate, view]);

    return { resources, events, providers, refreshEvents };
}
