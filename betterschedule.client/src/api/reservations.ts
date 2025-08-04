import axios from "axios";

export interface ReservationDto {
    id: number;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO string
    endTime: string;
    status: string;
    notes?: string;
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

export async function getReservations(params?: any): Promise<ReservationDto[]> {
    const { data } = await axios.get("/api/reservation", { params });
    return data.items || data;
}

export async function createReservation(payload: CreateReservationDto): Promise<ReservationDto> {
    const { data } = await axios.post("/api/reservation", payload);
    return data;
}
