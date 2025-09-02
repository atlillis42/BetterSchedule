import type { DayPilot } from "@daypilot/daypilot-lite-react";
import type { BlockedTimeDto } from "@/api/blockedtime-api";
import type { ReservationDto, ReservationParticipantDto } from "@/api/reservation-api";

/**
 * Event shape consumed by DayPilot components.
 */
export interface UiEvent {
    /** Unique id used by DayPilot. */
    id: string | number;
    /** Visible text label. */
    text: string;
    /** Local start instant. */
    start: DayPilot.Date;
    /** Local end instant. */
    end: DayPilot.Date;
    /** Optional resource association. */
    resource?: string | number;
    /** Optional background color. */
    backColor?: string;

    /** Event classification for UI logic. */
    type?: "reservation" | "blockedTime";
    /** Attached reservation payload. */
    reservation?: ReservationDto;
    /** Attached blocked-time payload. */
    blockedTime?: BlockedTimeDto;
    /** Participants for reservations. */
    participants?: ReservationParticipantDto[];

    /** Creator id used for ownership gating. */
    createdByUserId?: string;
    /** Optional creator display value. */
    createdByUserName?: string;
}

/**
 * Minimal schedulable resource shape.
 */
export interface CalendarResource {
    id: number;
    name: string;
    backColor?: string;
}
