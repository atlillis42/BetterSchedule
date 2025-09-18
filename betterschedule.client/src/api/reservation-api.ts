import { api } from "@auth/axios";
import { toast } from "react-toastify";
import type { ReservationParticipantDto } from "@/api/reservation-participants-api";

/** Reservation DTO returned by the API. */
export type ReservationDto = {
    id: number;
    organizationId: string;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO instant
    endTime: string;   // ISO instant
    status: "Booked" | "Completed" | "Canceled" | "NoShow";
    notes?: string | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    participants?: ReservationParticipantDto[];
    createdAt: string;          // ISO instant
    updatedAt?: string | null;  // ISO instant
    isDeleted: boolean;
};

/** Payload for creating a reservation. */
export type CreateReservationDto = {
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO instant
    endTime: string;   // ISO instant
    notes?: string | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
};

/** Partial payload for updating a reservation. */
export type UpdateReservationDto = {
    notes?: string | null;
    startTime?: string; // ISO instant
    endTime?: string;   // ISO instant
    status?: "Booked" | "Completed" | "Canceled" | "NoShow" | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    serviceProviderId?: string | null;
    appointmentTypeId?: number | null;
};

/** API error payload contract. */
type ApiErrorPayload = { code?: string; message?: string };

/** Throws a normalized `Error(message)` using the API's `{ code, message }` payload when present. */
function handleApiError(err: any, fallback: string): never {
    const p: ApiErrorPayload | undefined = err?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(fallback);
}

/**
 * Lists reservations overlapping an optional [start, end) (ISO date or instant).
 * Returns only reservations visible to the current principal.
 */
export async function getReservations(params: {
    start?: string;
    end?: string;
}): Promise<ReservationDto[]> {
    try {
        const { data } = await api.get<ReservationDto[]>("/reservation", { params });
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load reservations.");
    }
}

/** Retrieves a single reservation by id if visible to the current principal. */
export async function getReservation(id: number): Promise<ReservationDto> {
    try {
        const { data } = await api.get<ReservationDto>(`/reservation/${id}`);
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load reservation.");
    }
}

/**
 * Creates a reservation.
 * - When the server detects an overlap with the provider's existing reservations,
 *   it may still succeed (for providers) and include `X-Warned-Double-Booking: true`.
 * - Availability or block violations return `{ code: "OUTSIDE_AVAILABILITY" | "UNAVAILABLE", message }` with 409.
 */
export async function createReservation(
    payload: CreateReservationDto,
    opts: { overrideAvailability?: boolean; toastSuccess?: boolean } = { toastSuccess: true }
): Promise<ReservationDto> {
    try {
        const params = opts.overrideAvailability ? { overrideAvailability: true } : undefined;
        const res = await api.post<ReservationDto>("/reservation", payload, { params });

        const warned = res.headers?.["x-warned-double-booking"] === "true";
        if (opts.toastSuccess !== false) {
            toast.success("Reservation created.");
            if (warned) toast.info("Heads up: this overlaps another booking.");
        }

        return res.data;
    } catch (err: any) {
        const code = err?.response?.data?.code as string | undefined;
        const message = (err?.response?.data?.message as string) ?? "Failed to create reservation.";
        if (code === "OUTSIDE_AVAILABILITY" || code === "UNAVAILABLE") {
            throw new Error(message);
        }
        handleApiError(err, message);
    }
}

/**
 * Updates a reservation.
 * - May set `overrideAvailability` and/or `managerOverride` via query params.
 * - Availability or block violations return `{ code: "OUTSIDE_AVAILABILITY" | "UNAVAILABLE", message }` with 409.
 * - On successful update with overlap, server may include `X-Warned-Double-Booking: true`.
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: { overrideAvailability?: boolean; managerOverride?: boolean; toastSuccess?: boolean } = {
        toastSuccess: true,
    }
): Promise<void> {
    try {
        const params: Record<string, any> = {};
        if (opts.overrideAvailability) params.overrideAvailability = true;
        if (opts.managerOverride) params.managerOverride = true;

        const res = await api.put(`/reservation/${id}`, payload, { params });

        const warned = res.headers?.["x-warned-double-booking"] === "true";
        if (opts.toastSuccess !== false) {
            toast.success("Reservation updated.");
            if (warned) toast.info("Heads up: this overlaps another booking.");
        }
    } catch (err: any) {
        const code = err?.response?.data?.code as string | undefined;
        const message = (err?.response?.data?.message as string) ?? "Failed to update reservation.";
        if (code === "OUTSIDE_AVAILABILITY" || code === "UNAVAILABLE") {
            throw new Error(message);
        }
        handleApiError(err, message);
    }
}

/** Soft-deletes a reservation. */
export async function deleteReservation(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.delete(`/reservation/${id}`);
        if (opts.toastSuccess !== false) toast.success("Reservation deleted.");
    } catch (err: any) {
        handleApiError(err, "Failed to delete reservation.");
    }
}

/**
 * Convenience: sets reservation status and optionally appends a reason to the notes.
 * Uses `updateReservation` under the hood (and thus inherits the same error behavior).
 */
export async function setReservationStatus(
    id: number,
    status: "Completed" | "Canceled" | "NoShow",
    opts: {
        currentNotes?: string | null;
        reason?: string;
        managerOverride?: boolean;
        toastSuccess?: boolean;
    } = {}
): Promise<void> {
    const base = opts.currentNotes ?? "";
    const trimmed = (opts.reason ?? "").trim();
    const tag = trimmed ? `\n[status=${status}] ${trimmed}` : "";
    const notes = tag ? `${base ?? ""}${tag}` : undefined;

    return updateReservation(
        id,
        { status, notes },
        { managerOverride: !!opts.managerOverride, toastSuccess: opts.toastSuccess }
    );
}
