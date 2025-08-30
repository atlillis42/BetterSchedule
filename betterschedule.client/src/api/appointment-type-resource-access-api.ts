/**
 * Manager endpoints for AppointmentType ↔ Resource access.
 * - List resource IDs permitted for a given appointment type.
 * - Assign/unassign specific resources to a type.
 */
import { api } from "@auth/axios";
import type {
    AppointmentTypeId,
    ResourceId,
    AssignAppointmentTypeResourceRequest,
} from "@/types/accessTypes";

type ApiErrorPayload = { code?: string; message?: string };

function handleApiError(err: any, fallback: string): never {
    const p: ApiErrorPayload | undefined = err?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(fallback);
}

/**
 * Returns resource IDs an appointment type may use (org-scoped).
 * Excludes soft-deleted links and resources.
 */
export async function listResourceIdsByAppointmentType(
    appointmentTypeId: AppointmentTypeId
): Promise<ResourceId[]> {
    try {
        const { data } = await api.get<ResourceId[]>(
            `/appointment-type-resource-access/by-type/${appointmentTypeId}`
        );
        return data;
    } catch (err: any) {
        handleApiError(err, "Failed to load permitted resources for appointment type.");
    }
}

/**
 * Assigns a resource to an appointment type (idempotent; undeletes when needed).
 * 404 if the type or resource does not exist in the org (or is soft-deleted).
 */
export async function assignAppointmentTypeResource(
    body: AssignAppointmentTypeResourceRequest
): Promise<void> {
    try {
        await api.post<void>("/appointment-type-resource-access/assign", body);
    } catch (err: any) {
        handleApiError(err, "Failed to assign resource to appointment type.");
    }
}

/**
 * Soft-unassigns a resource from an appointment type (sets link IsDeleted=true).
 * 404 if no active link exists.
 */
export async function unassignAppointmentTypeResource(
    body: AssignAppointmentTypeResourceRequest
): Promise<void> {
    try {
        await api.post<void>("/appointment-type-resource-access/unassign", body);
    } catch (err: any) {
        handleApiError(err, "Failed to unassign resource from appointment type.");
    }
}
