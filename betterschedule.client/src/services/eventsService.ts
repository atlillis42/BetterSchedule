import { DayPilot } from "@daypilot/daypilot-lite-react";
import { getBlockedTimes } from "@/api/blockedtime-api";
import { getReservations } from "@/api/reservation-api";
import { blockedTimeToUiEvent } from "@/utilities/mapping/blockedTimeToUiEvent";
import { reservationToUiEvent } from "@/utilities/mapping/reservationToUiEvent";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";

/**
 * Aggregates reservations and blocked times for a visible range and maps them to UI events.
 * @param start - Start of the visible range (inclusive).
 * @param end - End of the visible range (exclusive).
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
 * Determines whether a reservation is soft-deleted.
 * Supports common shapes without requiring a DTO change:
 * - `isDeleted: boolean`
 * - `deleted: boolean`
 * - `deletedAt: string | Date` (presence indicates deletion; null/undefined means not deleted)
 * @param reservation - The reservation DTO to inspect.
 * @returns True if soft-deleted; otherwise false.
 */
function isReservationDeleted(reservation: ReservationDto | undefined): boolean {
    const obj = reservation as unknown as Record<string, unknown> | undefined;
    if (!obj) return false;

    const hasIsDeleted = typeof obj["isDeleted"] === "boolean";
    if (hasIsDeleted) return obj["isDeleted"] as boolean;

    const hasDeleted = typeof obj["deleted"] === "boolean";
    if (hasDeleted) return obj["deleted"] as boolean;

    if ("deletedAt" in (obj as object)) {
        const deletedAt = obj["deletedAt"] as unknown;
        // Consider any non-null/defined value as deleted; null/undefined = not deleted.
        return deletedAt !== null && deletedAt !== undefined;
    }

    return false;
}

/**
 * Filters events by deleted state.
 * - When `showDeleted` is false, removes reservations flagged as deleted.
 * - Canceled reservations remain visible (only Delete removes events from the calendar).
 * @param events - Source events.
 * @param showDeleted - When false, hides deleted reservations.
 * @returns Filtered events list.
 */
export function filterEventsByDeleted(events: UiEvent[], showDeleted: boolean): UiEvent[] {
    if (showDeleted) return events;
    return events.filter((event) => event.type !== "reservation" || !isReservationDeleted(event.reservation));
}

/**
 * @deprecated Canceled reservations should remain visible; use {@link filterEventsByDeleted}.
 * Legacy export forwards to deleted-based filtering to avoid breaking older imports.
 * @param events - Source events.
 * @param _showCanceled - Ignored; canceled filtering is no longer applied.
 * @returns Events filtered only for deleted reservations (not canceled).
 */
export function filterEventsByCanceled(events: UiEvent[], _showCanceled: boolean): UiEvent[] {
    // Forward to deleted-based filtering with the default behavior of not showing deleted.
    return filterEventsByDeleted(events, false);
}

/**
 * Filters blocked times based on the active view and user role.
 *
 * @param events - Source events.
 * @param view - Active view ("Day" | "Week" | "WorkWeek" | "Month" | "Resources").
 * @param ctx - User context for role-based filtering.
 * @returns Filtered events list.
 */
export function filterBlockedTimesForView(
    events: UiEvent[],
    view: "Day" | "Week" | "WorkWeek" | "Month" | "Resources",
    ctx: { userId?: string | null; isManager?: boolean }
): UiEvent[] {
    const { userId, isManager } = ctx;

    return events.filter((event) => {
        if (event.type !== "blockedTime") return true;

        const isResourceBlock = !!event.blockedTime?.resourceId;

        // Resource-specific blocks are only shown in the Resources view.
        if (view !== "Resources" && isResourceBlock) return false;

        // In Resources view, keep resource blocks; provider self-blocks remain visible.
        if (view === "Resources") return true;

        // For Day/Week/WorkWeek/Month: provider self-blocks
        // - Managers: show all
        // - Providers: only show their own
        if (!isResourceBlock) {
            if (isManager) return true;
            return !!userId && event.createdByUserId === userId;
        }

        return true;
    });
}
