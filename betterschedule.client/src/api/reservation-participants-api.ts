import { api } from "@auth/axios";

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

/** Payload to add a participant to a reservation. */
export type AddReservationParticipantDto = {
    /** Required for Client/ServiceProvider; must be null/omitted for Guest. */
    userId?: string | null;
    role: "Client" | "ServiceProvider" | "Guest";
    /** Guests only. */
    guestName?: string | null;
    /** Guests only. */
    guestPhone?: string | null;
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
 * Lists non-deleted participants for a reservation.
 * NOTE: Base axios already prefixes with `/api`; do not include it here.
 */
export async function listParticipants(reservationId: number): Promise<ReservationParticipantDto[]> {
    try {
        const { data } = await api.get<ReservationParticipantDto[]>(
            `/reservations/${reservationId}/participants`
        );
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load reservation participants.");
    }
}

/**
 * Adds a participant to a reservation.
 * - For Guest, omit `userId` and provide `guestName`.
 * - For Client/ServiceProvider, provide `userId` belonging to the org and with the role.
 * - When adding a ServiceProvider, server may warn or block based on availability/conflicts.
 */
export async function addParticipant(
    reservationId: number,
    payload: AddReservationParticipantDto
): Promise<ReservationParticipantDto> {
    try {
        const { data } = await api.post<ReservationParticipantDto>(
            `/reservations/${reservationId}/participants`,
            payload
        );
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to add reservation participant.");
    }
}

/** Soft-removes a participant from a reservation. */
export async function removeParticipant(reservationId: number, participantId: number): Promise<void> {
    try {
        await api.delete(`/reservations/${reservationId}/participants/${participantId}`);
    } catch (err: any) {
        handleApiError(err, "Failed to remove reservation participant.");
    }
}
