import { api } from "@auth/axios";
import { toast } from "react-toastify";

/**
 * Appointment type returned from the API.
 */
export type AppointmentTypeDto = {
    id: number;
    name: string;
    duration: string; // "hh:mm:ss"
    price: number;
    description?: string | null;
    createdByUserId: string;
    createdByUserName?: string | null;
    assignedResourceId?: number | null;   
    assignedResourceName?: string | null; 
    isPublic: boolean;
    requiresWaiver: boolean;
    isDeleted: boolean;
    organizationId: string;
};

/**
 * Payload for creating a new appointment type.
 */
export type CreateAppointmentTypeDto = {
    name: string;
    duration: string; // "hh:mm:ss"
    price?: number;
    description?: string | null;
    assignedResourceId?: number | null;  
    isPublic?: boolean;
    requiresWaiver?: boolean;
};

/**
 * Payload for updating an existing appointment type.
 */
export type UpdateAppointmentTypeDto = {
    name?: string | null;
    duration?: string | null; // "hh:mm:ss"
    price?: number | null;
    description?: string | null;
    isPublic?: boolean | null;
    requiresWaiver?: boolean | null;
    assignedResourceId?: number | null;  
};

/**
 * Retrieves all appointment types visible to the current user.
 * @returns List of appointment types.
 */
export async function getAppointmentTypes(): Promise<AppointmentTypeDto[]> {
    const { data } = await api.get("/appointmenttype");
    return data;
}

/**
 * Retrieves a single appointment type.
 * @param id - Appointment type identifier.
 * @returns The matching appointment type.
 */
export async function getAppointmentType(id: number): Promise<AppointmentTypeDto> {
    const { data } = await api.get(`/appointmenttype/${id}`);
    return data;
}

/**
 * Creates a new appointment type.
 * @param payload - Values for the new appointment type.
 * @param opts - Optional behaviour flags.
 * @returns The created appointment type.
 */
export async function createAppointmentType(
    payload: CreateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<AppointmentTypeDto> {
    const { data } = await api.post("/appointmenttype", payload);
    if (opts.toastSuccess) toast.success("Appointment type created.");
    return data;
}

/**
 * Updates an existing appointment type.
 * @param id - Appointment type identifier.
 * @param payload - Updated field values.
 * @param opts - Optional behaviour flags.
 */
export async function updateAppointmentType(
    id: number,
    payload: UpdateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/appointmenttype/${id}`, payload);
    if (opts.toastSuccess) toast.success("Appointment type updated.");
}

/**
 * Deletes an appointment type.
 * @param id - Appointment type identifier.
 * @param opts - Optional behaviour flags.
 */
export async function deleteAppointmentType(id: number, opts: { toastSuccess?: boolean } = { toastSuccess: true }): Promise<void> {
    await api.delete(`/appointmenttype/${id}`);
    if (opts.toastSuccess) toast.success("Appointment type deleted.");
}
