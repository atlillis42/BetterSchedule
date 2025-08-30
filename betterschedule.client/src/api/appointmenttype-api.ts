import { api } from "@auth/axios";
import { toast } from "react-toastify";

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

/** Payload to create a new appointment type. */
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
 * Payload to update an existing appointment type (partial).
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

function handleApiError(err: any, fallback: string): never {
    const p: ApiErrorPayload | undefined = err?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(fallback);
}

/** Retrieves all appointment types visible to the current user. */
export async function getAppointmentTypes(): Promise<AppointmentTypeDto[]> {
    const { data } = await api.get("/appointmenttype");
    return data;
}

/** Retrieves a single appointment type by id. */
export async function getAppointmentType(id: number): Promise<AppointmentTypeDto> {
    const { data } = await api.get(`/appointmenttype/${id}`);
    return data;
}

/**
 * Creates a new appointment type.
 * @returns The created appointment type.
 */
export async function createAppointmentType(
    payload: CreateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<AppointmentTypeDto> {
    try {
        const { data } = await api.post("/appointmenttype", payload);
        if (opts.toastSuccess) toast.success("Appointment type created.");
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to create appointment type.");
    }
}

/** Updates an existing appointment type (partial). */
export async function updateAppointmentType(
    id: number,
    payload: UpdateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.put(`/appointmenttype/${id}`, payload);
        if (opts.toastSuccess) toast.success("Appointment type updated.");
    } catch (err: any) {
        handleApiError(err, "Failed to update appointment type.");
    }
}

/** Soft-deletes an appointment type. */
export async function deleteAppointmentType(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.delete(`/appointmenttype/${id}`);
        if (opts.toastSuccess) toast.success("Appointment type deleted.");
    } catch (err: any) {
        handleApiError(err, "Failed to delete appointment type.");
    }
}
