import { api } from "@auth/axios";
import { toast } from "react-toastify";

/**
 * Participant attached to a reservation.
 *
 * @public
 */
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

/**
 * Reservation DTO returned by the API.
 * Extra fields may appear as the server evolves; keep forwards compatible.
 *
 * @public
 */
export type ReservationDto = {
    id: number;
    organizationId: string;
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string; // ISO
    status: "Booked" | "Completed" | "Canceled" | "NoShow";
    notes?: string | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    participants?: ReservationParticipantDto[];
    createdAt: string; // ISO
    updatedAt?: string | null; // ISO
    isDeleted: boolean;

    // Optional cancellation metadata (may be omitted by server):
    cancelledAt?: string | null;
    cancelledByUserId?: string | null;
    cancelReason?: string | null;
    isLateCancel?: boolean | null;
    cancelSource?: "Unknown" | "ClientPortal" | "Staff" | "System" | null;
};

/**
 * Payload for creating a reservation.
 *
 * @public
 */
export type CreateReservationDto = {
    clientId: string;
    serviceProviderId: string;
    appointmentTypeId: number;
    startTime: string; // ISO
    endTime: string; // ISO
    notes?: string | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
};

/**
 * Partial payload for updating a reservation.
 *
 * @public
 */
export type UpdateReservationDto = {
    notes?: string | null;
    startTime?: string; // ISO
    endTime?: string; // ISO
    status?: "Booked" | "Completed" | "Canceled" | "NoShow" | null;
    resourceId?: number | null;
    packageAssignmentId?: number | null;
    serviceProviderId?: string | null;
    appointmentTypeId?: number | null;
};

/**
 * Warning flags extracted from server response headers on successful
 * staff create/update operations.
 *
 * @public
 */
export type ReservationWarnings = {
    /** Operation violated advance booking lead-time policy (override applied). */
    leadTime?: boolean;
    /** Time overlaps another reservation (soft warning). */
    doubleBooking?: boolean;
    /** Collides with a provider’s blocked time (soft warning for staff). */
    providerBlocked?: boolean;
    /** Collides with a resource’s blocked time (soft warning for staff). */
    resourceBlocked?: boolean;
};

/**
 * Throws a normalized `Error(message)` and preserves HTTP response on the error
 * instance for upstream logic (e.g., branching on status).
 *
 * @param err - Axios error
 * @param fallback - Message used when the server did not return one
 * @throws Error
 * @internal
 */
function handleApiError(err: any, fallback: string): never {
    const res = err?.response;
    const data = res?.data;

    let message: string | undefined;
    if (data && typeof data === "object" && typeof data.message === "string") {
        message = data.message;
    } else if (typeof data === "string" && data.trim().length) {
        message = data;
    } else {
        message = fallback;
    }

    const e: any = new Error(message);
    e.status = res?.status;
    e.response = res;
    throw e;
}

/**
 * Parses reservation-related warning headers from an Axios response.
 *
 * @param headers - Axios response headers
 * @returns Parsed {@link ReservationWarnings}
 * @public
 */
export function parseReservationWarnings(
    headers: Record<string, string | string[] | undefined>
): ReservationWarnings {
    const h = new Map<string, string>();
    Object.entries(headers || {}).forEach(([k, v]) =>
        h.set(k.toLowerCase(), String(Array.isArray(v) ? v[0] : v ?? ""))
    );
    return {
        leadTime: h.get("x-warned-lead-time") === "true",
        doubleBooking: h.get("x-warned-double-booking") === "true",
        providerBlocked: h.get("x-warned-provider-blocked") === "true",
        resourceBlocked: h.get("x-warned-resource-blocked") === "true",
    };
}

/**
 * Lists reservations overlapping an optional [start, end) (ISO).
 * Returns only reservations visible to the current principal.
 *
 * @param params.start - Optional inclusive start (ISO)
 * @param params.end - Optional exclusive end (ISO)
 * @returns Array of {@link ReservationDto}
 * @throws Error when the request fails
 * @public
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

/**
 * Retrieves a single reservation by id if visible to the current principal.
 *
 * @param id - Reservation identifier
 * @returns {@link ReservationDto}
 * @throws Error when the request fails or the item is not visible
 * @public
 */
export async function getReservation(id: number): Promise<ReservationDto> {
    try {
        const { data } = await api.get<ReservationDto>(`/reservation/${id}`);
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load reservation.");
    }
}

/**
 * Creates a reservation and exposes server warning headers to the caller.
 * This function does **not** emit UI toasts; call sites control UX.
 *
 * @param payload - Create payload
 * @returns Created dto and parsed {@link ReservationWarnings}
 * @throws Error on validation/conflict failures
 * @public
 */
export async function createReservationWithWarnings(
    payload: CreateReservationDto
): Promise<{ data: ReservationDto; warnings: ReservationWarnings }> {
    try {
        const res = await api.post<ReservationDto>("/reservation", payload);
        return { data: res.data, warnings: parseReservationWarnings(res.headers as any) };
    } catch (err: any) {
        const code = err?.response?.data?.code as string | undefined;
        const message =
            (err?.response?.data?.message as string) ?? "Failed to create reservation.";
        if (code === "RESERVATION_CONFLICT") {
            throw new Error(message);
        }
        handleApiError(err, message);
    }
}

/**
 * Updates a reservation and exposes server warning headers to the caller.
 * This function does **not** emit UI toasts; call sites control UX.
 *
 * @param id - Reservation identifier
 * @param payload - Partial update payload
 * @returns Parsed {@link ReservationWarnings}
 * @throws Error on validation/conflict failures
 * @public
 */
export async function updateReservationWithWarnings(
    id: number,
    payload: UpdateReservationDto
): Promise<{ warnings: ReservationWarnings }> {
    try {
        const res = await api.put(`/reservation/${id}`, payload);
        return { warnings: parseReservationWarnings(res.headers as any) };
    } catch (err: any) {
        const code = err?.response?.data?.code as string | undefined;
        const message =
            (err?.response?.data?.message as string) ?? "Failed to update reservation.";
        if (code === "RESERVATION_CONFLICT") {
            throw new Error(message);
        }
        handleApiError(err, message);
    }
}

/**
 * Creates a reservation and shows success/warning toasts.
 * Back-compat wrapper over {@link createReservationWithWarnings}.
 *
 * @param payload - Create payload
 * @param opts.toastSuccess - Whether to show success toast (default true)
 * @returns Created {@link ReservationDto}
 * @throws Error on validation/conflict failures
 * @public
 */
export async function createReservation(
    payload: CreateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<ReservationDto> {
    const { data, warnings } = await createReservationWithWarnings(payload);
    if (opts.toastSuccess !== false) {
        toast.success("Reservation created.");
        if (warnings.doubleBooking) toast.info("Heads up: this overlaps another booking.");
    }
    return data;
}

/**
 * Updates a reservation and shows success/warning toasts.
 * Back-compat wrapper over {@link updateReservationWithWarnings}.
 *
 * @param id - Reservation identifier
 * @param payload - Partial update payload
 * @param opts.toastSuccess - Whether to show success toast (default true)
 * @throws Error on validation/conflict failures
 * @public
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    const { warnings } = await updateReservationWithWarnings(id, payload);
    if (opts.toastSuccess !== false) {
        toast.success("Reservation updated.");
        if (warnings.doubleBooking) toast.info("Heads up: this overlaps another booking.");
    }
}

/**
 * Soft-deletes a reservation.
 *
 * @param id - Reservation identifier
 * @param opts.toastSuccess - Whether to show success toast (default true)
 * @throws Error when the request fails
 * @public
 */
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
 * Client self-cancel (pre-start). Inside the window the server marks a late cancel.
 *
 * @param id - Reservation identifier
 * @param opts.toastSuccess - Whether to show success toast (default false)
 * @throws Error when the request fails
 * @public
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
 * Convenience helper that sets reservation status and optionally appends a reason
 * to the existing notes (tagged entry).
 *
 * @param id - Reservation identifier
 * @param status - Target status
 * @param opts.currentNotes - Current notes content (if known)
 * @param opts.reason - Optional reason appended as a tagged line
 * @param opts.toastSuccess - Whether to show success toast
 * @public
 */
export async function setReservationStatus(
    id: number,
    status: "Completed" | "Canceled" | "NoShow",
    opts: {
        currentNotes?: string | null;
        reason?: string;
        toastSuccess?: boolean;
    } = {}
): Promise<void> {
    const base = opts.currentNotes ?? "";
    const trimmed = (opts.reason ?? "").trim();
    const tag = trimmed ? `\n[status=${status}] ${trimmed}` : "";
    const notes = tag ? `${base ?? ""}${tag}` : undefined;

    return updateReservation(id, { status, notes }, { toastSuccess: opts.toastSuccess });
}
