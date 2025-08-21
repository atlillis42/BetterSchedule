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
    participants?: ReservationParticipantDto[];
    createdAt: string;
    updatedAt?: string | null;
    isDeleted: boolean;
};

/**
 * Participant information on a reservation.
 */
export type ReservationParticipantDto = {
    id: number;
    reservationId: number;
    userId: string;
    guestName?: string | null;
    guestPhone?: string | null;
    role: string;
    organizationId: string;
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
 */
export async function getReservations(params: { start?: string; end?: string }): Promise<ReservationDto[]> {
    const { data } = await api.get("/reservation", { params });
    return data;
}

/**
 * Retrieves a single reservation by id.
 */
export async function getReservation(id: number): Promise<ReservationDto> {
    const { data } = await api.get(`/reservation/${id}`);
    return data;
}

/**
 * Creates a reservation.
 * @param payload - Reservation details.
 * @param opts - Optional behaviour flags.
 *   - overrideAvailability: allow managers or the provider to confirm and bypass availability rule
 *   - toastSuccess: show success toast on completion (default true)
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

        // Surface known conflict codes with a clean Error for upstream handling (e.g., confirmation flows)
        if (code === "UNAVAILABLE" || code === "OUTSIDE_AVAILABILITY") {
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
 *   - overrideAvailability: allow managers or the provider to confirm and bypass availability rule
 *   - managerOverride: allow managers to bypass cancel window rule
 *   - toastSuccess: show success toast on completion (default true)
 */
export async function updateReservation(
    id: number,
    payload: UpdateReservationDto,
    opts: { overrideAvailability?: boolean; managerOverride?: boolean; toastSuccess?: boolean } = { toastSuccess: true }
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

        if (code === "UNAVAILABLE" || code === "OUTSIDE_AVAILABILITY") {
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
export async function deleteReservation(
    id: number,
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.delete(`/reservation/${id}`);
    if (opts.toastSuccess !== false) toast.success("Reservation deleted.");
}

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

    // Append a tagged line when a reason is supplied (MVP approach)
    const tag = trimmed ? `\n[status=${status}] ${trimmed}` : "";
    const notes = tag ? `${base ?? ""}${tag}` : undefined;

    await updateReservation(
        id,
        { status, notes },
        { managerOverride: !!opts.managerOverride, toastSuccess: opts.toastSuccess }
    );
}
