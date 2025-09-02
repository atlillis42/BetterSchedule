import type { CalendarResource } from "@/types";
import { generateTimeOptions } from "@/utilities/conversions";

export interface EventModalFieldOptions {
    resources: CalendarResource[];
    values?: {
        id?: number | string;
        type?: "reservation" | "blockedTime";
        startDate?: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;

        clientId?: string;
        serviceProviderId?: string;
        appointmentTypeId?: string | number;
        notes?: string;

        reason?: string;
        resourceId?: number | string;
        backColor?: string;

        delete?: boolean;
        formError?: string;
    };
    includeDelete?: boolean;
}

/**
 * Returns a field schema for the Event modal, parameterized by current values and available resources.
 * The returned structure is consumed by the modal renderer.
 */
export function eventModalFields({
    resources,
    values = {},
    includeDelete = false,
}: EventModalFieldOptions) {
    const TIME_OPTIONS = generateTimeOptions();
    const type = values.type ?? "reservation";
    const isReservation = type === "reservation";
    const isEdit = typeof values.id !== "undefined" && values.id !== null;

    const fields: any[] = [];

    if (values.formError) {
        fields.push({
            name: "",
            id: "formError",
            type: "note",
            html: `<div style="color: red; font-weight: bold; margin-bottom: 8px;">${values.formError}</div>`,
        });
    }

    fields.push({
        name: "Type",
        id: "type",
        type: "radio",
        options: [
            { name: "Reservation", id: "reservation" },
            { name: "Blocked Time", id: "blockedTime" },
        ],
        value: type,
    });

    if (isReservation) {
        if (!isEdit) {
            fields.push(
                { name: "Client ID", id: "clientId", type: "text", value: values.clientId ?? "" },
                {
                    name: "Service Provider",
                    id: "serviceProviderId",
                    type: "select",
                    options: resources.map((r) => ({ name: r.name, id: String(r.id) })),
                    value: values.serviceProviderId ?? "",
                },
                { name: "Appointment Type", id: "appointmentTypeId", type: "text", value: values.appointmentTypeId ?? "" },
            );
        } else {
            fields.push(
                { name: "Client", id: "clientInfo", type: "note", html: `<div>Client: ${values.clientId ?? "-"}</div>` },
                { name: "Provider", id: "providerInfo", type: "note", html: `<div>Provider: ${values.serviceProviderId ?? "-"}</div>` },
                { name: "Type", id: "typeInfo", type: "note", html: `<div>Type: ${values.appointmentTypeId ?? "-"}</div>` },
            );
        }

        fields.push({ name: "Notes", id: "notes", type: "textarea", value: values.notes ?? "" });
    } else {
        fields.push(
            { name: "Reason", id: "reason", type: "text", value: values.reason ?? "" },
            {
                name: "Resource",
                id: "resourceId",
                type: "select",
                options: [{ name: "(None)", id: "" }, ...resources.map((r) => ({ name: r.name, id: r.id }))],
                value: values.resourceId ?? "",
            },
        );
    }

    fields.push(
        { name: "Start Date", id: "startDate", type: "date", value: values.startDate ?? "" },
        { name: "Start Time", id: "startTime", type: "select", options: TIME_OPTIONS.map((t) => ({ name: t, id: t })), value: values.startTime ?? "" },
        { name: "End Date", id: "endDate", type: "date", value: values.endDate ?? "" },
        { name: "End Time", id: "endTime", type: "select", options: TIME_OPTIONS.map((t) => ({ name: t, id: t })), value: values.endTime ?? "" },
    );

    if (includeDelete) {
        fields.push({ name: "Delete Event", id: "delete", type: "checkbox", value: !!values.delete });
    }

    return fields;
}
