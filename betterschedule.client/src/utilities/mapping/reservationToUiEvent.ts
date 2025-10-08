import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";
import { classForReservationStatus, colorForReservationStatus, tooltipForReservation } from "@/domain/calendar/eventStyle";

/**
 * Maps a reservation DTO into a DayPilot UI event.
 * Ensures `resource` matches Resource view column ids (cast to string).
 */
export function reservationToUiEvent(res: ReservationDto): UiEvent {
    const statusClass = classForReservationStatus(res.status); // e.g., "res-status-completed"
    const statusColor = colorForReservationStatus(res.status); // e.g., "#10b981"

    const resourceKey =
        res.resourceId !== null && res.resourceId !== undefined
            ? String(res.resourceId)
            : undefined;

    return {
        id: `reservation-${res.id}`,
        text: res.notes ?? "Reservation",
        start: utcIsoToDayPilotLocal(res.startTime),
        end: utcIsoToDayPilotLocal(res.endTime),
        /** Match DayPilotCalendar(Resources) columns[*].id (we use string consistently). */
        resource: resourceKey,
        cssClass: `ev-reservation ${statusClass}`,
        type: "reservation",
        reservation: res,
        participants: res.participants,
        toolTip: tooltipForReservation(res.status),
        // DayPilot property to hide inner duration bar (we rely on our CSS chip)
        // (Not part of UiEvent TS surface; accepted by DayPilot at runtime.)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        barHidden: true,
        backColor: statusColor,
    } as UiEvent;
}
