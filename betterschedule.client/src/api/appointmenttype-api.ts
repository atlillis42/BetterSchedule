import { api } from "@auth/axios";

/**
 * Read model for an organization-scoped appointment type.
 * @remarks
 * - `duration` uses `hh:mm:ss` (maps to .NET `TimeSpan`).
 * - `isDeleted` is a soft-delete flag.
 */
export type AppointmentTypeDto = {
    /** Identifier of the appointment type. */
    id: number;
    /** Display name. Unique within an organization (case-insensitive). */
    name: string;
    /** Scheduled length as `hh:mm:ss`. */
    duration: string;
    /** Price in major currency units (e.g., USD). */
    price: number;
    /** Optional description shown to users. */
    description?: string | null;
    /** User id who created this appointment type. */
    createdByUserId: string;
    /** Optional display value for creator (e.g., name). */
    createdByUserName?: string | null;
    /** Identifier of default resource, if any. */
    assignedResourceId?: number | null;
    /** Display name of default resource, if any. */
    assignedResourceName?: string | null;
    /** Whether visible to clients. */
    isPublic: boolean;
    /** Whether a waiver is required. */
    requiresWaiver: boolean;
    /** Soft-delete flag. */
    isDeleted: boolean;
    /** Owning organization id. */
    organizationId: string;
};

/**
 * Create payload for an appointment type.
 */
export type CreateAppointmentTypeDto = {
    /** Display name (unique within org, case-insensitive). */
    name: string;
    /** Scheduled length as `hh:mm:ss`. */
    duration: string;
    /** Price in major currency units (default 0). */
    price?: number;
    /** Optional description. */
    description?: string | null;
    /** Optional default resource id to bind. */
    assignedResourceId?: number | null;
    /** Whether visible to clients (default false). */
    isPublic?: boolean;
    /** Whether a waiver is required (default false). */
    requiresWaiver?: boolean;
};

/**
 * Patch-style update payload for an appointment type.
 * To unassign the default resource, set `clearAssignedResource: true`.
 * Do not send both `clearAssignedResource: true` and `assignedResourceId`.
 */
export type UpdateAppointmentTypeDto = {
    name?: string | null;
    duration?: string | null;
    price?: number | null;
    description?: string | null;
    isPublic?: boolean | null;
    requiresWaiver?: boolean | null;
    assignedResourceId?: number | null;
    clearAssignedResource?: boolean;
};

type ApiErrorPayload = { code?: string; message?: string };

/**
 * Converts axios error payloads into consistent `Error`s.
 * @param err Unknown error from axios.
 * @param fallback Message used when the server did not provide one.
 * @throws Always throws an `Error` with a user-friendly message.
 */
function handleApiError(err: unknown, fallback: string): never {
    const p: ApiErrorPayload | undefined = (err as any)?.response?.data;
    const message = (p?.message as string) || fallback;
    throw new Error(message);
}

/**
 * Retrieves all appointment types visible to the current user.
 */
export async function getAppointmentTypes(): Promise<AppointmentTypeDto[]> {
    const { data } = await api.get<AppointmentTypeDto[]>("/appointmenttype");
    return data;
}

/**
 * Retrieves a single appointment type by id.
 * @param id Appointment type identifier.
 */
export async function getAppointmentType(id: number): Promise<AppointmentTypeDto> {
    const { data } = await api.get<AppointmentTypeDto>(`/appointmenttype/${id}`);
    return data;
}

/**
 * Creates a new appointment type.
 * @param payload Create payload.
 * @returns The created appointment type.
 */
export async function createAppointmentType(
    payload: CreateAppointmentTypeDto,
): Promise<AppointmentTypeDto> {
    try {
        const { data } = await api.post<AppointmentTypeDto>("/appointmenttype", payload);
        return data;
    } catch (err) {
        handleApiError(err, "Failed to create appointment type.");
    }
}

/**
 * Updates an existing appointment type (partial).
 * @param id Appointment type identifier.
 * @param payload Patch fields.
 */
export async function updateAppointmentType(
    id: number,
    payload: UpdateAppointmentTypeDto,
): Promise<void> {
    try {
        await api.put(`/appointmenttype/${id}`, payload);
    } catch (err) {
        handleApiError(err, "Failed to update appointment type.");
    }
}

/**
 * Soft-deletes an appointment type.
 * @param id Appointment type identifier.
 */
export async function deleteAppointmentType(
    id: number,
): Promise<void> {
    try {
        await api.delete(`/appointmenttype/${id}`);
    } catch (err) {
        handleApiError(err, "Failed to delete appointment type.");
    }
}
