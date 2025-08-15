import { api } from "@auth/axios";
import { toast } from "react-toastify";

/**
 * Reservation returned from the API.
 */
export type ReservationDto = {
    id: number;
    organizationId: string;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string;   // ISO
    status: string;    // "Booked" | "Completed" | "Canceled" | "NoShow"
    notes?: string | null;
    resourceId?: number | null;           
    packageAssignmentId?: number | null;
    createdAt: string;
    updatedAt?: string | null;
    isDeleted: boolean;
};

/**
 * Payload for creating a reservation.
 */
export type CreateReservationDto = {
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string;   // ISO
    notes?: string | null;
    resourceId?: number | null;           
    packageAssignmentId?: number | null;
};

/**
 * Payload for updating an existing reservation.
 */
export type UpdateReservationDto = {
    notes?: string | null;
    startTime?: string; // ISO
    endTime?: string;   // ISO
    status?: string | null;
    resourceId?: number | null;           
    packageAssignmentId?: number | null;
    serviceProviderId?: string | null;
    appointmentTypeId?: number | null;
};

/**
 * Retrieves reservations within an optional range.
 * @param params - Optional start and end ISO timestamps.
 * @returns List of reservations.
 */
export async function getReservations(params: { start?: string; end?: string; }): Promise<ReservationDto[]> {
    const { data } = await api.get("/reservation", { params });
    return data;
}

/**
 * Creates a reservation.
 * @param payload - Reservation details.
 * @param opts - Optional behaviour flags.
 * @returns The created reservation.
 */
export async function createReservation(
    payload: CreateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<ReservationDto> {
    try {
        const res = await api.post<ReservationDto>("/reservation", payload);
        const warned = res.headers?.["x-warned-double-booking"] === "true";
        if (opts.toastSuccess) {
            toast.success("Reservation created.");
            if (warned) toast.info("Heads up: this overlaps another booking.");
        }
        return res.data;
    } catch (err: any) {
        const code = err?.response?.data?.code;
        const message = err?.response?.data?.message || "Failed to create reservation.";
        if (code === "UNAVAILABLE") {
            throw new Error(message);
        }
        throw err;
    }
}

/**
 * Updates an existing reservation.
 * @param id - Reservation identifier.
 * @param payload - Updated reservation fields.
 * @param opts - Optional behaviour flags.
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        const res = await api.put(`/reservation/${id}`, payload);
        const warned = res.headers?.["x-warned-double-booking"] === "true";
        if (opts.toastSuccess) {
            toast.success("Reservation updated.");
            if (warned) toast.info("Heads up: this overlaps another booking.");
        }
    } catch (err: any) {
        const code = err?.response?.data?.code;
        const message = err?.response?.data?.message || "Failed to update reservation.";
        if (code === "UNAVAILABLE") {
            throw new Error(message);
        }
        throw err;
    }
}

/**
 * Deletes a reservation.
 * @param id - Reservation identifier.
 * @param opts - Optional behaviour flags.
 */
export async function deleteReservation(id: number, opts: { toastSuccess?: boolean } = { toastSuccess: true }): Promise<void> {
    await api.delete(`/reservation/${id}`);
    if (opts.toastSuccess) toast.success("Reservation deleted.");
}
