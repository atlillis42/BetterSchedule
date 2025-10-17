import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";
import { classForReservationStatus, colorForReservationStatus, tooltipForReservation } from "@/domain/calendar/eventStyle";

/**
 * Maps a {@link ReservationDto} into a DayPilot-compatible {@link UiEvent}.
 * - Keeps canceled reservations visible (styling reflects status).
 * - Uses the status class for consistent theming across views.
 */
export function reservationToUiEvent(reservation: ReservationDto): UiEvent {
    const statusClass = classForReservationStatus(reservation.status);
    const statusColor = colorForReservationStatus(reservation.status);

    const resourceKey =
        reservation.resourceId !== null && reservation.resourceId !== undefined
            ? String(reservation.resourceId)
            : undefined;

    return {
        id: `reservation-${reservation.id}`,
        text: reservation.notes ?? "Reservation",
        start: utcIsoToDayPilotLocal(reservation.startTime),
        end: utcIsoToDayPilotLocal(reservation.endTime),
        resource: resourceKey,
        cssClass: `ev-reservation ${statusClass}`,
        type: "reservation",
        reservation,
        participants: reservation.participants,
        toolTip: tooltipForReservation(reservation.status),
        barHidden: true,
        backColor: statusColor,
    } as UiEvent;
}
