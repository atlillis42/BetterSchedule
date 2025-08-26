/**
 * Summary: Manager endpoints for Provider ↔ AppointmentType access.
 * - List appointment type IDs granted to a provider.
 * - Assign/unassign specific types to a provider.
 */
import { api } from "@auth/axios";
import type {
    AppointmentTypeId,
    UserId,
    AssignProviderAppointmentTypeRequest,
} from "@/types/accessTypes";

/**
 * GET: appointment type IDs a provider can use.
 */
export async function listAppointmentTypeIdsByProvider(userId: UserId): Promise<AppointmentTypeId[]> {
    const { data } = await api.get<AppointmentTypeId[]>(`/provider-appointment-type-access/by-provider/${userId}`);
    return data;
}

/**
 * POST: assign a provider to an appointment type.
 */
export async function assignProviderAppointmentType(body: AssignProviderAppointmentTypeRequest): Promise<void> {
    await api.post<void>("/provider-appointment-type-access/assign", body);
}

/**
 * POST: unassign a provider from an appointment type.
 */
export async function unassignProviderAppointmentType(body: AssignProviderAppointmentTypeRequest): Promise<void> {
    await api.post<void>("/provider-appointment-type-access/unassign", body);
}
