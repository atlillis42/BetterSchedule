import { api } from "@auth/axios";
import type {
    ProviderAvailabilityDto,
    CreateProviderAvailabilityDto,
    UpdateProviderAvailabilityDto,
} from "@/types/providerAvailabilityTypes";

type ApiErrorPayload = { code?: string; message?: string };

/**
 * Normalizes Axios errors from API endpoints that return `{ code, message }`.
 * Always throws an `Error` with a user-facing message.
 *
 * @param err - Unknown error object (Axios error shape supported).
 * @param fallback - Message used when the server did not provide one.
 * @throws {Error} Always.
 */
function handleApiError(err: unknown, fallback: string): never {
    const anyErr = err as any;
    const data: ApiErrorPayload | string | undefined = anyErr?.response?.data;
    if (data) {
        if (typeof data === "string") throw new Error(data);
        if (data.message) throw new Error(data.message);
    }
    throw new Error(fallback);
}

/**
 * Lists weekly availability rules visible to the caller.
 *
 * @remarks
 * - **Visibility**: Managers see all; Providers see self; Clients see providers who enabled `AvailabilityPublic`.
 * - **Filtering**: Pass `providerId` to limit results to a specific provider (subject to visibility rules).
 * - **Serialization**:
 *   - `dayOfWeek` is a string (e.g., `"Monday"`).
 *   - `startLocalTime` / `endLocalTime` are `"HH:mm:ss"`.
 *   - `effectiveFrom` / `effectiveTo` are `"YYYY-MM-DD"`.
 *
 * @param providerId - Optional provider user id filter.
 * @returns Availability rows.
 */
export async function listAvailability(
    providerId?: string
): Promise<ProviderAvailabilityDto[]> {
    try {
        const resp = await api.get<ProviderAvailabilityDto[]>("/provider-availability", {
            params: providerId ? { providerId } : undefined,
        });
        return resp.data;
    } catch (err) {
        handleApiError(err, "Failed to load availability.");
    }
}

/**
 * Retrieves a single availability row by identifier.
 * Uses the same visibility rules as {@link listAvailability}.
 *
 * @param id - Availability row identifier.
 * @returns The availability row if visible.
 */
export async function getAvailability(id: number): Promise<ProviderAvailabilityDto> {
    try {
        const resp = await api.get<ProviderAvailabilityDto>(`/provider-availability/${id}`);
        return resp.data;
    } catch (err) {
        handleApiError(err, "Failed to load availability row.");
    }
}

/**
 * Ensures a provider has default Mon–Fri availability sized to organization business hours.
 * Returns whether rows were created and how many.
 *
 * @param providerId - Target provider user id.
 * @returns Creation summary `{ created, count }`.
 */
export async function ensureDefaultAvailability(
    providerId: string
): Promise<{ created: boolean; count: number }> {
    try {
        const resp = await api.post<{ created: boolean; count: number }>(
            `/provider-availability/providers/${encodeURIComponent(providerId)}/ensure-default`
        );
        return resp.data;
    } catch (err) {
        handleApiError(err, "Failed to ensure default availability.");
    }
}

/**
 * Creates a weekly availability rule.
 *
 * @param payload - Availability details (provider, day, local times, effective dates).
 * @returns The created availability row.
 */
export async function createAvailability(
    payload: CreateProviderAvailabilityDto
): Promise<ProviderAvailabilityDto> {
    try {
        const resp = await api.post<ProviderAvailabilityDto>("/provider-availability", payload);
        return resp.data;
    } catch (err) {
        handleApiError(err, "Failed to create availability.");
    }
}

/**
 * Partially updates an existing weekly availability rule.
 *
 * @param id - Availability row identifier.
 * @param payload - Partial fields to update.
 */
export async function updateAvailability(
    id: number,
    payload: UpdateProviderAvailabilityDto
): Promise<void> {
    try {
        await api.put<void>(`/provider-availability/${id}`, payload);
    } catch (err) {
        handleApiError(err, "Failed to update availability.");
    }
}

/**
 * Soft-deletes an availability rule.
 *
 * @param id - Availability row identifier.
 */
export async function deleteAvailability(id: number): Promise<void> {
    try {
        await api.delete<void>(`/provider-availability/${id}`);
    } catch (err) {
        handleApiError(err, "Failed to delete availability.");
    }
}
