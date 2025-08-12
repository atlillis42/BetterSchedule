import { api } from "@auth/axios";
import { toast } from "react-toastify";

export type ReservationDto = {
    id: number;
    organizationId: string;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string;   // ISO
    status: string;    // "Booked" | "Completed" | "Canceled" | "NoShow" ...
    notes?: string | null;
    locationId?: string | null;
    packageAssignmentId?: number | null;
    createdAt: string;
    updatedAt?: string | null;
    isDeleted: boolean;
};

export type CreateReservationDto = {
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string;   // ISO
    notes?: string | null;
    locationId?: string | null;
    packageAssignmentId?: number | null;
};

export type UpdateReservationDto = {
    notes?: string | null;
    startTime?: string; // ISO
    endTime?: string;   // ISO
    status?: string | null;
    locationId?: string | null;
    packageAssignmentId?: number | null;
};

export async function getReservations(params: {
    start?: string;
    end?: string;
}): Promise<ReservationDto[]> {
    const { data } = await api.get("/reservation", { params });
    return data;
}

export async function createReservation(
    payload: CreateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<ReservationDto> {
    const { data } = await api.post("/reservation", payload);
    if (opts.toastSuccess) toast.success("Reservation created.");
    return data;
}

export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.put(`/reservation/${id}`, payload);
    if (opts.toastSuccess) toast.success("Reservation updated.");
}

export async function deleteReservation(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/reservation/${id}`);
    if (opts.toastSuccess) toast.success("Reservation deleted.");
}
