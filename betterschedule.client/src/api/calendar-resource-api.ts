import { api } from "@auth/axios";
import { toast } from "react-toastify";
import type { BlockedTimeDto as BlockedTime } from "@api/blockedtime-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

export type CalendarResourceDto = {
    id: number;
    organizationId: string;
    name: string;
    backColor?: string | null;
    blockedTimes: BlockedTime[];
    isDeleted: boolean;
};

export type CreateCalendarResourceDto = {
    name: string;
    backColor?: string | null;
};

export type UpdateCalendarResourceDto = {
    name?: string | null;
    backColor?: string | null;
};

function dtoToUi(r: CalendarResourceDto): CalendarResource {
    return {
        id: r.id,
        name: r.name,
        backColor: r.backColor ?? undefined,
    };
}

export async function getResources(): Promise<CalendarResource[]> {
    const { data } = await api.get<CalendarResourceDto[]>("/calendar-resources");
    return data.map(dtoToUi);
}

export async function getResourceById(
    id: number,
    opts?: { start?: string; end?: string }
): Promise<CalendarResourceDto> {
    const { data } = await api.get<CalendarResourceDto>(`/calendar-resources/${id}`, { params: opts });
    return data;
}

export async function createResource(
    payload: CreateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<CalendarResourceDto> {
    const { data } = await api.post<CalendarResourceDto>("/calendar-resources", payload);
    if (opts.toastSuccess) toast.success("Resource created.");
    return data;
}

export async function updateResource(
    id: number,
    payload: UpdateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/calendar-resources/${id}`, payload);
    if (opts.toastSuccess) toast.success("Resource updated.");
}

export async function deleteResource(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/calendar-resources/${id}`);
    if (opts.toastSuccess) toast.success("Resource deleted.");
}
