import { api } from "@auth/axios";
import { toast } from "react-toastify";

/** Reservation DTO returned by the API. */
export type ReservationDto = {
    id: number;
    organizationId: string;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string;   // ISO
    status: "Booked" | "Completed" | "Canceled" | "NoShow";
    notes?: string | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    participants?: ReservationParticipantDto[];
    createdAt: string;          // ISO
    updatedAt?: string | null;  // ISO
    isDeleted: boolean;
};

/** Participant attached to a reservation. */
export type ReservationParticipantDto = {
    id: number;
    reservationId: number;
    userId: string; // empty string for guests
    guestName?: string | null;
    guestPhone?: string | null;
    role: "Client" | "ServiceProvider" | "Guest";
    organizationId: string;
    isDeleted: boolean;
};

/** Payload for creating a reservation. */
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

/** Partial payload for updating a reservation. */
export type UpdateReservationDto = {
    notes?: string | null;
    startTime?: string; // ISO
    endTime?: string;   // ISO
    status?: "Booked" | "Completed" | "Canceled" | "NoShow" | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    serviceProviderId?: string | null;
    appointmentTypeId?: number | null;
};


/** Throws a normalized Error(message) and preserves HTTP status/response for callers. */
function handleApiError(err: any, fallback: string): never {
    const res = err?.response;
    const data = res?.data;

    // Prefer server { message }, else plain string bodies, else fallback
    let message: string | undefined;
    if (data && typeof data === "object" && typeof data.message === "string") {
        message = data.message;
    } else if (typeof data === "string" && data.trim().length) {
        message = data;
    } else {
        message = fallback;
    }

    const e: any = new Error(message);
    // Preserve status/response so UI logic can branch (e.g., show override confirm)
    e.status = res?.status;
    e.response = res;
    throw e;
}

/**
 * Lists reservations overlapping an optional [start, end) (ISO).
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
 * - May set `overrideAvailability`, `managerOverride`, and/or `providerOverride` via query params.
 * - Availability or block violations return `{ code: "OUTSIDE_AVAILABILITY" | "UNAVAILABLE", message }` with 409.
 * - On successful update with overlap, server may include `X-Warned-Double-Booking: true`.
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: {
        overrideAvailability?: boolean;
        managerOverride?: boolean;
        providerOverride?: boolean;
        toastSuccess?: boolean;
    } = { toastSuccess: true }
): Promise<void> {
    try {
        const params: Record<string, any> = {};
        if (opts.overrideAvailability) params.overrideAvailability = true;
        if (opts.managerOverride) params.managerOverride = true;
        if (opts.providerOverride) params.providerOverride = true;

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
    opts: {
        managerOverride?: boolean;
        providerOverride?: boolean;
        toastSuccess?: boolean;
    } = { toastSuccess: true }
): Promise<void> {
    try {
        const params: Record<string, any> = {};
        if (opts.managerOverride) params.managerOverride = true;
        if (opts.providerOverride) params.providerOverride = true;

        await api.delete(`/reservation/${id}`, { params });
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
        providerOverride?: boolean;
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
        {
            managerOverride: !!opts.managerOverride,
            providerOverride: !!opts.providerOverride,
            toastSuccess: opts.toastSuccess,
        }
    );
}
