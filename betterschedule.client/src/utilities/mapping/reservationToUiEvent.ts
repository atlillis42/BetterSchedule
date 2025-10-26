// reservationToUiEvent.ts (only change is removing backColor)
import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";
import { classForReservationStatus, tooltipForReservation } from "@/domain/calendar/eventStyle";

export function reservationToUiEvent(reservation: ReservationDto): UiEvent {
    const statusClass = classForReservationStatus(reservation.status);

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
        barHidden: true
    } as UiEvent;
}
