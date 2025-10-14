import { api } from "@auth/axios";
import { toast } from "react-toastify";

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

/** Reservation DTO returned by the API. (kept compatible; extra fields may arrive later) */
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

    // Forward-compatible optional metadata the server may return now or later:
    cancelledAt?: string | null;
    cancelledByUserId?: string | null;
    cancelReason?: string | null;
    isLateCancel?: boolean | null;
    cancelSource?: "Unknown" | "ClientPortal" | "Staff" | "System" | null;
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
 * - New behavior: outside-availability on UPDATE is a soft warning (header `X-Outside-Availability: true`), not a hard block.
 * - Hard blocks remain for resource/provider blocks (`code: "UNAVAILABLE"` with 409).
 * - On successful update with overlap, server may include `X-Warned-Double-Booking: true`.
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: {
        overrideAvailability?: boolean; // allows staff to suppress availability warning when knowingly overriding
        managerOverride?: boolean;      // kept for API compatibility; ignored by server in new flow
        providerOverride?: boolean;     // kept for API compatibility; ignored by server in new flow
        toastSuccess?: boolean;
    } = { toastSuccess: true }
): Promise<void> {
    try {
        const params: Record<string, any> = {};
        if (opts.overrideAvailability) params.overrideAvailability = true;
        // managerOverride/providerOverride are no-ops now; keeping them in signature avoids breaking callers.

        const res = await api.put(`/reservation/${id}`, payload, { params });

        const warnedDouble = res.headers?.["x-warned-double-booking"] === "true";
        const outsideAvail = res.headers?.["x-outside-availability"] === "true";

        if (opts.toastSuccess !== false) {
            toast.success("Reservation updated.");
            if (warnedDouble) toast.info("Heads up: this overlaps another booking.");
            if (outsideAvail) toast.info("Outside provider availability (override allowed).");
        }
    } catch (err: any) {
        const code = err?.response?.data?.code as string | undefined;
        const message = (err?.response?.data?.message as string) ?? "Failed to update reservation.";
        if (code === "UNAVAILABLE") {
            // Hard block
            throw new Error(message);
        }
        // "OUTSIDE_AVAILABILITY" should no longer appear on UPDATE (soft warn), but handle defensively:
        if (code === "OUTSIDE_AVAILABILITY") {
            throw new Error(message);
        }
        handleApiError(err, message);
    }
}

/** Soft-deletes a reservation. (No longer requires override flags; kept in signature for compatibility.) */
export async function deleteReservation(
    id: number,
    opts: {
        managerOverride?: boolean; // ignored by server in new flow
        providerOverride?: boolean; // ignored by server in new flow
        toastSuccess?: boolean;
    } = { toastSuccess: true }
): Promise<void> {
    try {
        await api.delete(`/reservation/${id}`);
        if (opts.toastSuccess !== false) toast.success("Reservation deleted.");
    } catch (err: any) {
        handleApiError(err, "Failed to delete reservation.");
    }
}

/**
 * Client self-cancel (pre-start). Always allowed by the server and classified as late when inside the org window.
 * No overrides or extra params required.
 */
export async function cancelReservationAsClient(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: false }
): Promise<void> {
    try {
        await api.post(`/reservation/${id}/cancel`);
        if (opts.toastSuccess) toast.success("Reservation canceled.");
    } catch (err: any) {
        handleApiError(err, "Failed to cancel reservation.");
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
        managerOverride?: boolean;   // retained for compatibility (ignored by server)
        providerOverride?: boolean;  // retained for compatibility (ignored by server)
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
