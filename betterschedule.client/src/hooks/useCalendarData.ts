import { useEffect, useState } from "react";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { CalendarResource, UiEvent } from "@/types";
import { fetchResources } from "@/services/resourcesService";
import { fetchEventsInRange } from "@/services/eventsService";
import { getProvidersOrDerive, type ProviderLite } from "@/services/providersService";
import { getVisibleRange } from "@/utilities/calendarDisplay/getVisibleRange";
import { getAppointmentTypes } from "@/api/appointmenttype-api";
import { getClientNameCached } from "@/services/clientNameCache";

/**
 * Loads resources, events, providers, and shared lookups for the visible window.
 * Hydrates client names and appointment type labels before exposing events to the UI
 * to avoid visible "pop-in" of placeholders.
 */
export function useCalendarData(startDate: DayPilot.Date, view: "Day" | "Week" | "WorkWeek" | "Month" | "Resources") {
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [providers, setProviders] = useState<ProviderLite[]>([]);
    const [appointmentTypesById, setAppointmentTypesById] = useState<Map<number, string>>(new Map());

    /**
     * Re-fetches events for the current visible range.
     * Prefetches client display names before updating state to minimize label pop-in.
     */
    async function refreshEvents() {
        const { start, end } = getVisibleRange(startDate, view);
        const list = await fetchEventsInRange(start, end);

        const clientIds = Array.from(
            new Set(list.map(e => e?.reservation?.clientId).filter((id): id is string => !!id))
        );

        // Eagerly hydrate client names so the first render has labels.
        if (clientIds.length) {
            await Promise.all(clientIds.map(id => getClientNameCached(id)));
        }

        setEvents(list);
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { start, end } = getVisibleRange(startDate, view);

                // Fetch everything we need for a nice first paint.
                const [resList, eventList, typeList] = await Promise.all([
                    fetchResources(),
                    fetchEventsInRange(start, end),
                    getAppointmentTypes(),
                ]);
                if (cancelled) return;

                // Build appt-type lookup map first.
                const types = new Map<number, string>();
                for (const t of typeList) types.set(t.id, t.name);
                setAppointmentTypesById(types);

                // Warm client-name cache for all clients we will display.
                const clientIds = Array.from(
                    new Set(eventList.map(e => e?.reservation?.clientId).filter((id): id is string => !!id))
                );
                if (clientIds.length) {
                    await Promise.all(clientIds.map(id => getClientNameCached(id)));
                    if (cancelled) return;
                }

                setResources(resList);
                setEvents(eventList);

                // Providers can be derived from events or fetched; keep existing logic.
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

    return { resources, events, providers, refreshEvents, appointmentTypesById };
}
