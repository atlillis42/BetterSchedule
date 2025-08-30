import { api } from "@auth/axios";
import { toast } from "react-toastify";
import type { BlockedTimeDto as BlockedTime } from "@api/blockedtime-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

/** Read model for a schedulable resource (room, chair, equipment). */
export type CalendarResourceDto = {
    /** Resource identifier. */
    id: number;
    /** Owning organization id. */
    organizationId: string;
    /** Display name (unique within org, case-insensitive). */
    name: string;
    /** Optional CSS hex color (e.g., "#d0d0d0"). */
    backColor?: string | null;
    /**
     * Resource-level blocked times. Present on detail reads;
     * list responses typically omit or return an empty list.
     */
    blockedTimes: BlockedTime[];
    /** Soft-delete flag. */
    isDeleted: boolean;
};

/** Payload to create a resource. */
export type CreateCalendarResourceDto = {
    /** Display name (unique within org, case-insensitive). */
    name: string;
    /** Optional CSS hex color. */
    backColor?: string | null;
};

/** Payload to update a resource (partial). */
export type UpdateCalendarResourceDto = {
    /** New display name. */
    name?: string | null;
    /** New CSS hex color. */
    backColor?: string | null;
};

type ApiErrorPayload = { code?: string; message?: string };

function handleApiError(err: any, fallback: string): never {
    const p: ApiErrorPayload | undefined = err?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(fallback);
}

/** Converts an API DTO to a minimal UI shape. */
function dtoToUi(r: CalendarResourceDto): CalendarResource {
    return {
        id: r.id,
        name: r.name,
        backColor: r.backColor ?? undefined,
    };
}

/**
 * Retrieves non-deleted resources for the current organization.
 * @returns Resources mapped to a minimal UI shape.
 */
export async function getResources(): Promise<CalendarResource[]> {
    try {
        const { data } = await api.get<CalendarResourceDto[]>("/calendar-resources");
        return data.map(dtoToUi);
    } catch (err: any) {
        handleApiError(err, "Failed to load resources.");
    }
}

/**
 * Retrieves a resource by id, optionally including blocked times overlapping `[start, end)`.
 * @param id Resource identifier.
 * @param opts Optional ISO timestamps: `start`, `end`.
 * @returns Full resource DTO, including `blockedTimes` when requested.
 */
export async function getResourceById(
    id: number,
    opts?: { start?: string; end?: string }
): Promise<CalendarResourceDto> {
    try {
        const { data } = await api.get<CalendarResourceDto>(`/calendar-resources/${id}`, { params: opts });
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load resource.");
    }
}

/**
 * Creates a resource.
 * @param payload Resource details.
 * @param opts Optional UI behavior flags.
 * @returns The created resource DTO.
 * @throws Error with `{message}` from `{ code, message }` payload on validation/conflict.
 */
export async function createResource(
    payload: CreateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<CalendarResourceDto> {
    try {
        const { data } = await api.post<CalendarResourceDto>("/calendar-resources", payload);
        if (opts.toastSuccess) toast.success("Resource created.");
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to create resource.");
    }
}

/**
 * Updates a resource (partial).
 * @param id Resource identifier.
 * @param payload Fields to change.
 * @param opts Optional UI behavior flags.
 * @throws Error with `{message}` from `{ code, message }` payload on validation/conflict.
 */
export async function updateResource(
    id: number,
    payload: UpdateCalendarResourceDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.put(`/calendar-resources/${id}`, payload);
        if (opts.toastSuccess) toast.success("Resource updated.");
    } catch (err: any) {
        handleApiError(err, "Failed to update resource.");
    }
}

/**
 * Soft-deletes a resource.
 * @param id Resource identifier.
 * @param opts Optional UI behavior flags.
 * @throws Error with `{message}` from `{ code, message }` payload on validation.
 */
export async function deleteResource(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.delete(`/calendar-resources/${id}`);
        if (opts.toastSuccess) toast.success("Resource deleted.");
    } catch (err: any) {
        handleApiError(err, "Failed to delete resource.");
    }
}
