// Shared types for calendar events and resources (API, DayPilot, backend DTOs)

export interface CalendarEvent {
    id: number | string;
    text: string;
    start: string;                // ISO8601 string
    end: string;                  // ISO8601 string
    resource?: number | string;
    backColor?: string;   
}

export interface CalendarResource {
    id: number | string;
    name: string;
    backColor?: string;
}
