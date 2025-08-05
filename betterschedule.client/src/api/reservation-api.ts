import { api } from "@auth/axios";

export interface ReservationDto {
    id: number;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    status: string;
    notes?: string;
    locationId?: string;
    packageAssignmentId?: number;
    createdAt: string;
    updatedAt?: string;
    isDeleted: boolean;
}

export interface CreateReservationDto {
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string;
    endTime: string;
    locationId?: string;
    packageAssignmentId?: number;
    notes?: string;
}

export async function getReservations(params?: { start?: string; end?: string }): Promise<ReservationDto[]> {
    const { data } = await api.get("/reservation", { params });
    // Support both paged and non-paged response shapes
    return data.items || data;
}

export async function createReservation(payload: CreateReservationDto): Promise<ReservationDto> {
    const { data } = await api.post("/reservation", payload);
    return data;
}

export async function updateReservation(id: number, payload: Partial<CreateReservationDto>): Promise<void> {
    await api.put(`/reservation/${id}`, payload);
}

export async function deleteReservation(id: number): Promise<void> {
    await api.delete(`/reservation/${id}`);
}
