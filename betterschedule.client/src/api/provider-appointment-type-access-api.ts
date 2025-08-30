/**
 * Manager endpoints for Provider ↔ AppointmentType access.
 * - List appointment type IDs granted to a provider.
 * - Assign/unassign specific types to a provider.
 */
import { api } from "@auth/axios";
import type {
    AppointmentTypeId,
    UserId,
    AssignProviderAppointmentTypeRequest,
} from "@/types/accessTypes";

type ApiErrorPayload = { code?: string; message?: string };
const handle = (e: any, f: string): never => {
    const p: ApiErrorPayload | undefined = e?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(f);
};

/** Returns appointment type IDs a provider may perform (org-scoped). */
export async function listAppointmentTypeIdsByProvider(
    userId: UserId
): Promise<AppointmentTypeId[]> {
    try {
        const { data } = await api.get<AppointmentTypeId[]>(
            `/provider-appointment-type-access/by-provider/${userId}`
        );
        return data;
    } catch (err: any) {
        handle(err, "Failed to load permitted appointment types for provider.");
    }
}

/** Assigns an appointment type to a provider (idempotent; undeletes when needed). */
export async function assignProviderAppointmentType(
    body: AssignProviderAppointmentTypeRequest
): Promise<void> {
    try {
        await api.post<void>("/provider-appointment-type-access/assign", body);
    } catch (err: any) {
        handle(err, "Failed to assign appointment type to provider.");
    }
}

/** Soft-unassigns an appointment type from a provider. */
export async function unassignProviderAppointmentType(
    body: AssignProviderAppointmentTypeRequest
): Promise<void> {
    try {
        await api.post<void>("/provider-appointment-type-access/unassign", body);
    } catch (err: any) {
        handle(err, "Failed to unassign appointment type from provider.");
    }
}
