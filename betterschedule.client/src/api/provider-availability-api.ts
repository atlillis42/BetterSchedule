import { api } from "@auth/axios";
import { toast } from "react-toastify";

/**
 * Availability slot returned from the API.
 */
export type ProviderAvailabilityDto = {
    id: number;
    organizationId: string;
    serviceProviderId: string;
    dayOfWeek?: number | null; // 0=Sunday
    startTime: string; // "HH:mm" or "HH:mm:ss"
    endTime: string;   // "HH:mm" or "HH:mm:ss"
    isException: boolean;
    exceptionDate?: string | null; // YYYY-MM-DD when isException
};

/**
 * Payload for creating or updating availability slots in bulk.
 */
export type UpsertProviderAvailabilityDto = {
    id?: number;
    dayOfWeek?: number | null; // 0=Sunday
    startTime: string; // "HH:mm" or "HH:mm:ss"
    endTime: string;   // "HH:mm" or "HH:mm:ss"
    isException?: boolean;
    exceptionDate?: string | null; // YYYY-MM-DD when isException
};

/**
 * Retrieves availability slots for a service provider.
 * @param providerId - Service provider identifier.
 * @returns List of availability slots.
 */
export async function getProviderAvailability(providerId: string): Promise<ProviderAvailabilityDto[]> {
    const { data } = await api.get(`/provider-availability/${providerId}`);
    return data;
}

/**
 * Bulk upserts availability slots for a service provider.
 * @param providerId - Service provider identifier.
 * @param payload - Availability slots to create/update.
 * @param opts - Optional behaviour flags.
 */
export async function bulkUpsertProviderAvailability(
    providerId: string,
    payload: UpsertProviderAvailabilityDto[],
    opts: { toastSuccess?: boolean } = { toastSuccess: true }
): Promise<void> {
    await api.post(`/provider-availability/${providerId}/bulk`, payload);
    if (opts.toastSuccess) toast.success("Availability saved.");
}