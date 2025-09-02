import { DayPilot } from "@daypilot/daypilot-lite-react";
import { getBlockedTimes } from "@/api/blockedtime-api";
import { getReservations } from "@/api/reservation-api";
import { blockedTimeToUiEvent } from "@/utilities/mapping/blockedTimeToUiEvent";
import { reservationToUiEvent } from "@/utilities/mapping/reservationToUiEvent";
import type { UiEvent } from "@/types/calendarDataTypes";

/**
 * Aggregates reservations and blocked times for a visible range and maps them to UI events.
 * @param start Start of the visible range (local).
 * @param end End of the visible range (local).
 * @returns Combined list of UI events.
 */
export async function fetchEventsInRange(start: DayPilot.Date, end: DayPilot.Date): Promise<UiEvent[]> {
    const startStr = start.toString("yyyy-MM-dd");
    const endStr = end.toString("yyyy-MM-dd");

    const [blockedTimes, reservations] = await Promise.all([
        getBlockedTimes({ start: startStr, end: endStr }),
        getReservations({ start: startStr, end: endStr }),
    ]);

    const blockedEvents = blockedTimes.map(blockedTimeToUiEvent);
    const reservationEvents = reservations.map(reservationToUiEvent);
    return [...blockedEvents, ...reservationEvents];
}

/**
 * Returns events filtered by the canceled toggle.
 * @param events Source events.
 * @param showCanceled When false, removes canceled reservations.
 */
export function filterEventsByCanceled(events: UiEvent[], showCanceled: boolean): UiEvent[] {
    if (showCanceled) return events;
    return events.filter((e) => e.type !== "reservation" || e?.reservation?.status !== "Canceled");
}
