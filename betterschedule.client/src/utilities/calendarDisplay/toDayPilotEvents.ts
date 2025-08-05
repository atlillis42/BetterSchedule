import type { UiEvent } from "@/types/calendarDataTypes";


/**
 * Convert UiEvent[] (possibly containing DayPilot.Date for start/end)
 * into objects with only string or Date for DayPilot views.
 */
type DayPilotEvent = {
    id: string | number;
    text: string;
    start: string | Date;
    end: string | Date;
    [key: string]: any;
};

export function toDayPilotEvents(events: UiEvent[]): DayPilotEvent[] {
    return events.map(event => ({
        ...event,
        start:
            event.start instanceof Date
                ? event.start
                : (event.start && typeof event.start !== "string" && "toDate" in event.start)
                    ? event.start.toDate()
                    : new Date(event.start),
        end:
            event.end instanceof Date
                ? event.end
                : (event.end && typeof event.end !== "string" && "toDate" in event.end)
                    ? event.end.toDate()
                    : new Date(event.end),
    }));
}
