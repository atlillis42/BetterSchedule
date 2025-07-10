import { api } from "@auth/axios";
import { DayPilot } from "@daypilot/daypilot-lite-react";
import type { CalendarEvent, CalendarResource } from "@/types/calendarDataTypes";

// ------------ ASP-NET CalendarController DTOs ---------------
export interface CalendarResourceDto {
    id: number;
    name: string;
    backColor?: string;
}

export interface CalendarEventDto {
    id: number;
    text: string;
    startUtc: string;   // backend uses StartUtc / EndUtc
    endUtc: string;
    resourceId?: number;
    backColor?: string;
}

// --------------- REST api endpoints----------------------------

// GET /api/calendar/resources 
export const getResources = (): Promise<CalendarResource[]> =>
    api.get<CalendarResourceDto[]>("/calendar/resources").then((res) =>
        res.data.map((r) => ({
            id: r.id,
            name: r.name,
            backColor: r.backColor
        }))
    );

// GET /api/calendar/events
// Backend expects `start` & `end` (yyyy‑MM‑dd). Range derived from view.

export const getEvents = (
    start: DayPilot.Date,
    view: "Day" | "Week" | "Month" | "Resources"
): Promise<CalendarEvent[]> => {
    const end = start.addDays(view === "Day" ? 1 : view === "Week" ? 7 : 30);

    return api
        .get<CalendarEventDto[]>("/calendar/events", {
            params: {
                start: start.toString("yyyy-MM-dd"),
                end: end.toString("yyyy-MM-dd")
            }
        })
        .then((res) =>
            res.data.map((e) => ({
                id: e.id,
                text: e.text,
                start: e.startUtc, // rename for DayPilot
                end: e.endUtc,
                resource: e.resourceId,
                backColor: e.backColor
            }))
        );
};

// POST /api/calendar/events
export const createEvent = async (event: {
    text: string;
    startUtc: string;
    endUtc: string;
    resourceId?: number | null;
    backColor?: string;
}) =>
    api.post("/calendar/events", event).then((res) => res.data);

// ------------ TODO ----------------------------------
// • Add SWR / React‑Query cache layer.
// • PUT/DELETE helpers when CRUD UI lands.
// • Centralise DTO ➜ UI mapping once shapes diverge further.
