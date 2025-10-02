import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";
import { classForReservationStatus, colorForReservationStatus, tooltipForReservation } from "@/domain/calendar/eventStyle";

/**
 * Maps a reservation DTO into a DayPilot UI event.
 * Adds a stable cssClass and default color derived from status.
 */
export function reservationToUiEvent(res: ReservationDto): UiEvent {
    const statusClass = classForReservationStatus(res.status);     // e.g., "res-status-completed"
    const statusColor = colorForReservationStatus(res.status);     // e.g., "#10b981"

    return {
        id: `reservation-${res.id}`,
        text: res.notes ?? "Reservation",                          
        start: utcIsoToDayPilotLocal(res.startTime),
        end: utcIsoToDayPilotLocal(res.endTime),
        resource: typeof res.resourceId === "number" ? res.resourceId : undefined,
        cssClass: `ev-reservation ${statusClass}`,                 
        type: "reservation",
        reservation: res,
        participants: res.participants,
        toolTip: tooltipForReservation(res.status),                // DayPilot tooltip (hover)
        barHidden: true,                                           
    } as UiEvent;
}
