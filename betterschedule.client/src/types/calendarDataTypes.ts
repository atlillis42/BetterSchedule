import type { DayPilot } from "@daypilot/daypilot-lite-react";
import type { BlockedTimeDto } from "@/api/blockedtime-api";
import type { ReservationDto } from "@/api/reservation-api";

export interface UiEvent {
    id: string | number;
    text: string;
    start: DayPilot.Date;
    end: DayPilot.Date;
    resource?: string | number;
    backColor?: string;
    type?: "reservation" | "blockedTime";
    reservation?: ReservationDto;
    blockedTime?: BlockedTimeDto;
}

export interface CalendarResource {
    id: number;
    name: string;
    backColor?: string;
}
