import { utcIsoToDayPilotLocal } from "@/utilities/conversions";
import type { UiEvent } from "@/types/calendarDataTypes";
import type { ReservationDto } from "@/api/reservation-api";

/**
 * Maps a reservation DTO into a DayPilot UI event.
 * @param res Reservation read model.
 */
export function reservationToUiEvent(res: ReservationDto): UiEvent {
    return {
        id: `reservation-${res.id}`,
        text: res.notes ?? "Reservation",
        start: utcIsoToDayPilotLocal(res.startTime),
        end: utcIsoToDayPilotLocal(res.endTime),
        resource: typeof res.resourceId === "number" ? res.resourceId : undefined,
        backColor: "#3b82f6",
        type: "reservation",
        reservation: res,
        participants: res.participants,
    };
}
