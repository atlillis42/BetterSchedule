import type { CalendarResource } from "@/types/calendarDataTypes";
import { generateTimeOptions } from "@/utilities/conversions"; 

export interface EventModalFieldOptions {
    resources: CalendarResource[];
    values?: {
        type?: "reservation" | "blockedTime";
        text?: string;
        startDate?: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;
        resourceId?: number | string;
        delete?: boolean;
        formError?: string;
        clientId?: string;         // Reservation
        appointmentTypeId?: string | number; // Reservation
        reason?: string;           // Blocked Time
    };
    includeDelete?: boolean;
}

/**
 * Modal field schema for create/edit event.
 * Pass in prefilled values for editing, or blank/defaults for create.
 */
export function eventModalFields({
    resources,
    values = {},
    includeDelete = false
}: EventModalFieldOptions) {
    const TIME_OPTIONS = generateTimeOptions();
    const type = values.type ?? "reservation"; //Defaults to 'reservation'
    const isReservation = type === "reservation";

    const fields = [
        ...(values.formError
            ? [{
                name: "",
                id: "formError",
                type: "note",
                html: `<div style="color: red; font-weight: bold; margin-bottom: 8px;">${values.formError}</div>`
            }]
            : []),

        // TYPE SELECTOR
        {
            name: "Type",
            id: "type",
            type: "radio",
            options: [
                { name: "Reservation", id: "reservation" },
                { name: "Blocked Time", id: "blockedTime" }
            ],
            value: type
        },

        // FIELDS FOR RESERVATION
        ...(isReservation
            ? [
                { name: "Event Name", id: "text", type: "text", value: values.text ?? "" },
                { name: "Client ID", id: "clientId", type: "text", value: values.clientId ?? "" },
                { name: "Appointment Type", id: "appointmentTypeId", type: "text", value: values.appointmentTypeId ?? "" },
            ]
            : []),

        // FIELDS FOR BLOCKED TIME
        ...(!isReservation
            ? [
                { name: "Reason", id: "reason", type: "text", value: values.reason ?? "" }                
            ]
            : []),

        // COMMON FIELDS (always shown)
        { name: "Start Date", id: "startDate", type: "date", value: values.startDate ?? "" },
        { name: "Start Time", id: "startTime", type: "select", options: TIME_OPTIONS.map(t => ({ name: t, id: t })), value: values.startTime ?? "" },
        { name: "End Date", id: "endDate", type: "date", value: values.endDate ?? "" },
        { name: "End Time", id: "endTime", type: "select", options: TIME_OPTIONS.map(t => ({ name: t, id: t })), value: values.endTime ?? "" },
        {
            name: "Resource",
            id: "resourceId",
            type: "select",
            options: [{ name: "(None)", id: "" }, ...resources.map(r => ({ name: r.name, id: r.id }))],
            value: values.resourceId ?? ""
        },

        ...(includeDelete ? [
            { name: "Delete Event", id: "delete", type: "checkbox", value: !!values.delete }
        ] : [])
    ];

    return fields;
}


