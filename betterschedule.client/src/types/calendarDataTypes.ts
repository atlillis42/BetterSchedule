// Shared types for calendar events and resources (API, DayPilot, backend DTOs)

export interface ApiEvent {
    id: number | string;
    text: string;
    startUtc: string;          // ISO-8601, UTC
    endUtc: string;          // ISO-8601, UTC
    resourceId?: number | string;
    backColor?: string;
}

export type UiEvent = import("@daypilot/daypilot-lite-react").DayPilot.EventData;

export interface CalendarResource {
    id: number;
    name: string;
    backColor?: string;
}
