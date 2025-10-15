import { api } from "@auth/axios";

/**
 * Link between a provider (user) and an appointment type.
 * Endpoints are org-scoped.
 */
export type ProviderAppointmentTypeLink = {
    /** Provider (user) identifier. */
    userId: string;
    /** Appointment type identifier. */
    appointmentTypeId: number;
};

type ApiErrorPayload = { code?: string; message?: string };

/**
 * Converts axios error payloads into consistent `Error`s.
 * @param err Unknown error from axios.
 * @param fallback Message used when the server did not provide one.
 * @throws Always throws an `Error` with a user-friendly message.
 */
function handleApiError(err: unknown, fallback: string): never {
    const p: ApiErrorPayload | undefined = (err as any)?.response?.data;
    const message = (p?.message as string) || fallback;
    throw new Error(message);
}

/**
 * Lists appointment type ids currently assigned to the given provider.
 * @param userId Provider (user) identifier.
 * @returns Array of appointment type identifiers; empty when none.
 */
export async function listAppointmentTypeIdsByProvider(userId: string): Promise<number[]> {
    try {
        const { data } = await api.get<number[]>(
            `/provider-appointment-type-access/by-provider/${encodeURIComponent(userId)}`
        );
        return Array.isArray(data) ? data : [];
    } catch (err) {
        handleApiError(err, "Unable to load type assignments for provider.");
    }
}

/**
 * Assigns an appointment type to a provider.
 * The checkbox updates immediately in the UI; on failure it is reverted.
 * @param link Provider/appointment-type link payload.
 */
export async function assignProviderAppointmentType(link: ProviderAppointmentTypeLink): Promise<void> {
    try {
        await api.post("/provider-appointment-type-access/assign", link);
    } catch (err) {
        handleApiError(err, "Unable to grant appointment type access.");
    }
}

/**
 * Removes an appointment type from a provider.
 * The checkbox updates immediately in the UI; on failure it is reverted.
 * @param link Provider/appointment-type link payload.
 */
export async function unassignProviderAppointmentType(link: ProviderAppointmentTypeLink): Promise<void> {
    try {
        await api.post("/provider-appointment-type-access/unassign", link);
    } catch (err) {
        handleApiError(err, "Unable to remove appointment type access.");
    }
}
