import { api } from "@auth/axios";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { ApiEvent, CalendarResource } from "@/types/calendarDataTypes";

// ------------ ASP-NET CalendarController DTOs ---------------
export interface CalendarResourceDto {
    id: number;
    name: string;
    backColor?: string;
}

export interface CalendarEventDto {
    id: number | string;
    text: string;
    startUtc: string;   // backend uses StartUtc / EndUtc
    endUtc: string;
    resourceId?: number | string;
    backColor?: string;
}

// --------------- REST api endpoints----------------------------

// GET /api/calendar/resources
export const getResources = async (): Promise<CalendarResource[]> => {
    const { data } = await api.get<CalendarResourceDto[]>("/calendar/resources");
    return data.map((r) => ({
        id: r.id,
        name: r.name,
        backColor: r.backColor
    }));
};


// GET /api/calendar/events
export const getEvents = async (
    start: DayPilot.Date,
    end: DayPilot.Date
): Promise<ApiEvent[]> => {
    const { data } = await api.get<CalendarEventDto[]>("/calendar/events", {
        params: {
            start: start.toString("yyyy-MM-dd"),
            end: end.toString("yyyy-MM-dd")
        }
    });
    // Backend already sends the exact ApiEvent shape ⇢ just return it
    return data as ApiEvent[];
};


// POST /api/calendar/events
export const createEvent = async (event: {
    text: string;
    startUtc: string;
    endUtc: string;
    resourceId?: number | null;
    backColor?: string;
}) => {
    const { data } = await api.post("/calendar/events", event);
    return data;
};


// PUT /api/calendar/events/{id}
export const updateEvent = async (
    id: number | string,
    event: {
        text: string;
        startUtc: string;
        endUtc: string;
        resourceId?: number | string;
        backColor?: string;
    }
) => {
    const { data } = await api.put(`/calendar/events/${id}`, event);
    return data;
};


// DELETE /api/calendar/events/{id}
export const deleteEvent = async (id: number | string) => {
    const { data } = await api.delete(`/calendar/events/${id}`);
    return data;
};


//  TODO
//  • Add SWR / React-Query cache layer.
//  • Centralise DTO ➜ UI mapping if shapes diverge further.

