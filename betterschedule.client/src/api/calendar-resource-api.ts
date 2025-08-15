import { api } from "@auth/axios";
import { toast } from "react-toastify";
import type { BlockedTimeDto as BlockedTime } from "@api/blockedtime-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

/**
 * Calendar resource returned from the API.
 */
export type CalendarResourceDto = {
    id: number;
    organizationId: string;
    name: string;
    backColor?: string | null;
    blockedTimes: BlockedTime[];
    isDeleted: boolean;
};

/**
 * Payload for creating a calendar resource.
 */
export type CreateCalendarResourceDto = {
    name: string;
    backColor?: string | null;
};

/**
 * Payload for updating a calendar resource.
 */
export type UpdateCalendarResourceDto = {
    name?: string | null;
    backColor?: string | null;
};

/**
 * Converts an API DTO to a UI-friendly representation.
 */
function dtoToUi(r: CalendarResourceDto): CalendarResource {
    return {
        id: r.id,
        name: r.name,
        backColor: r.backColor ?? undefined,
    };
}

/**
 * Retrieves calendar resources.
 * @returns List of resources formatted for UI consumption.
 */
export async function getResources(): Promise<CalendarResource[]> {
    const { data } = await api.get<CalendarResourceDto[]>("/calendar-resources");
    return data.map(dtoToUi);
}

/**
 * Retrieves a resource by identifier with optional blocked time range.
 * @param id - Resource identifier.
 * @param opts - Optional start/end parameters.
 * @returns The matching resource DTO.
 */
export async function getResourceById(
    id: number,
    opts?: { start?: string; end?: string }
): Promise<CalendarResourceDto> {
    const { data } = await api.get<CalendarResourceDto>(`/calendar-resources/${id}`, { params: opts });
    return data;
}

/**
 * Creates a new calendar resource.
 * @param payload - Resource details.
 * @param opts - Optional behaviour flags.
 * @returns The created resource DTO.
 */
export async function createResource(
    payload: CreateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<CalendarResourceDto> {
    const { data } = await api.post<CalendarResourceDto>("/calendar-resources", payload);
    if (opts.toastSuccess) toast.success("Resource created.");
    return data;
}

/**
 * Updates an existing calendar resource.
 * @param id - Resource identifier.
 * @param payload - Updated values for the resource.
 * @param opts - Optional behaviour flags.
 */
export async function updateResource(
    id: number,
    payload: UpdateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/calendar-resources/${id}`, payload);
    if (opts.toastSuccess) toast.success("Resource updated.");
}

/**
 * Deletes a calendar resource.
 * @param id - Resource identifier.
 * @param opts - Optional behaviour flags.
 */
export async function deleteResource(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/calendar-resources/${id}`);
    if (opts.toastSuccess) toast.success("Resource deleted.");
}
