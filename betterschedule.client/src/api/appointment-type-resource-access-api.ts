/**
 * Summary: Manager endpoints for AppointmentType ↔ Resource access.
 * - List resource IDs permitted for a given appointment type.
 * - Assign/unassign specific resources to a type.
 */
import { api } from "@auth/axios";
import type {
    AppointmentTypeId,
    ResourceId,
    AssignAppointmentTypeResourceRequest,
} from "@/types/accessTypes";

/**
 * GET: resource IDs an appointment type may use.
 */
export async function listResourceIdsByAppointmentType(appointmentTypeId: AppointmentTypeId): Promise<ResourceId[]> {
    const { data } = await api.get<ResourceId[]>(`/appointment-type-resource-access/by-type/${appointmentTypeId}`);
    return data;
}

/**
 * POST: assign a resource to an appointment type.
 */
export async function assignAppointmentTypeResource(body: AssignAppointmentTypeResourceRequest): Promise<void> {
    await api.post<void>("/appointment-type-resource-access/assign", body);
}

/**
 * POST: unassign a resource from an appointment type.
 */
export async function unassignAppointmentTypeResource(body: AssignAppointmentTypeResourceRequest): Promise<void> {
    await api.post<void>("/appointment-type-resource-access/unassign", body);
}
