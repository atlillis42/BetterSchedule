import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type BlockedTimeDto = {
    id: number;
    organizationId: string;
    reason: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    resourceId?: number | null;
    backColor?: string | null;
    isDeleted: boolean;
};

export type CalendarResourceDto = {
    id: number;
    organizationId: string;
    name: string;
    backColor?: string | null;
    blockedTimes: BlockedTimeDto[]; // list = [], detail can include items
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

export async function getResources(): Promise<CalendarResourceDto[]> {
    const { data } = await api.get("/calendar-resources");
    return data;
}

// Enriched GET (includes BlockedTimes for a single resource)
export async function getResourceById(
    id: number,
    opts?: { start?: string; end?: string }
): Promise<CalendarResourceDto> {
    const { data } = await api.get(`/calendar-resources/${id}`, { params: opts });
    return data;
}

export async function createResource(
    payload: CreateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<CalendarResourceDto> {
    const { data } = await api.post("/calendar-resources", payload);
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
