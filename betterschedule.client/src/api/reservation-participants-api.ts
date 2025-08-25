import { api } from "@auth/axios";

export type ReservationParticipantDto = {
    id: number;
    reservationId: number;
    userId: string; // empty for guests
    guestName?: string | null;
    guestPhone?: string | null;
    role: "Client" | "ServiceProvider" | "Guest";
    organizationId: string;
    isDeleted: boolean;
};

export type AddReservationParticipantDto = {
    userId?: string | null; // required for Client/ServiceProvider, null for Guest
    role: "Client" | "ServiceProvider" | "Guest";
    guestName?: string | null; // Guests only
    guestPhone?: string | null;
};

export async function listParticipants(reservationId: number) {
    const { data } = await api.get<ReservationParticipantDto[]>(
        `/api/reservations/${reservationId}/participants`
    );
    return data;
}

export async function addParticipant(
    reservationId: number,
    payload: AddReservationParticipantDto
) {
    const { data } = await api.post<ReservationParticipantDto>(
        `/api/reservations/${reservationId}/participants`,
        payload
    );
    return data;
}

export async function removeParticipant(reservationId: number, participantId: number) {
    await api.delete(`/api/reservations/${reservationId}/participants/${participantId}`);
}
