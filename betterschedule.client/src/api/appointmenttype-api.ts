import { api } from "@auth/axios";

export interface AppointmentTypeDto {
    id: number;
    name: string;
    duration: string; // e.g., "01:00:00"
    price: number;
    description?: string;
    createdByUserId: string;
    assignedLocationId?: string;
    isPublic: boolean;
    requiresWaiver: boolean;
    isDeleted: boolean;
}

export interface CreateAppointmentTypeDto {
    name: string;
    duration: string;
    price: number;
    description?: string;
    createdByUserId: string;
    assignedLocationId?: string;
    isPublic: boolean;
    requiresWaiver: boolean;
}

interface PagedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export async function getAppointmentTypes(): Promise<AppointmentTypeDto[]> {
    const { data } = await api.get<PagedResult<AppointmentTypeDto>>("/appointmenttype");
    return data.items;
}

export async function createAppointmentType(payload: CreateAppointmentTypeDto): Promise<AppointmentTypeDto> {
    const { data } = await api.post("/appointmenttype", payload);
    return data;
}

export async function updateAppointmentType(id: number, payload: Partial<CreateAppointmentTypeDto>): Promise<void> {
    await api.put(`/appointmenttype/${id}`, payload);
}

export async function deleteAppointmentType(id: number): Promise<void> {
    await api.delete(`/appointmenttype/${id}`);
}
