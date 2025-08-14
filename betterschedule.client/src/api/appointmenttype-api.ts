import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type AppointmentTypeDto = {
    id: number;
    name: string;
    duration: string; // "hh:mm:ss"
    price: number;
    description?: string | null;
    createdByUserId: string;
    createdByUserName?: string | null;
    assignedLocationId?: number | null;
    assignedLocationName?: string | null;
    isPublic: boolean;
    requiresWaiver: boolean;
    isDeleted: boolean;
    organizationId: string;
};


export type CreateAppointmentTypeDto = {
    name: string;
    duration: string; // "hh:mm:ss"
    price?: number;
    description?: string | null;
    assignedLocationId?: number | null;
    isPublic?: boolean;
    requiresWaiver?: boolean;
};

export type UpdateAppointmentTypeDto = {
    name?: string | null;
    duration?: string | null; // "hh:mm:ss"
    price?: number | null;
    description?: string | null;
    isPublic?: boolean | null;
    requiresWaiver?: boolean | null;
    assignedLocationId?: number | null;
};

export async function getAppointmentTypes(): Promise<AppointmentTypeDto[]> {
    const { data } = await api.get("/appointmenttype");
    return data;
}

export async function getAppointmentType(id: number): Promise<AppointmentTypeDto> {
    const { data } = await api.get(`/appointmenttype/${id}`);
    return data;
}

export async function createAppointmentType(
    payload: CreateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<AppointmentTypeDto> {
    const { data } = await api.post("/appointmenttype", payload);
    if (opts.toastSuccess) toast.success("Appointment type created.");
    return data;
}

export async function updateAppointmentType(
    id: number,
    payload: UpdateAppointmentTypeDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/appointmenttype/${id}`, payload);
    if (opts.toastSuccess) toast.success("Appointment type updated.");
}

export async function deleteAppointmentType(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/appointmenttype/${id}`);
    if (opts.toastSuccess) toast.success("Appointment type deleted.");
}
