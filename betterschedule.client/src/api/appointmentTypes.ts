import axios from "axios";

export interface AppointmentTypeDto {
    id: number;
    name: string;
    duration: string; // ISO timespan or parse as needed
    price?: number;
    description?: string;
    createdByUserId: string;
    assignedLocationId?: string;
    isPublic: boolean;
    requiresWaiver: boolean;
    isDeleted: boolean;
}

export async function getAppointmentTypes(params?: any): Promise<AppointmentTypeDto[]> {
    const { data } = await axios.get("/api/appointmenttype", { params });
    // If paged: return data.items;
    return data.items || data;
}
