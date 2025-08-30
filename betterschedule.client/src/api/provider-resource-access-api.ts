import { api } from "@auth/axios";

/**
 * Link between a provider (user) and a calendar resource.
 * Endpoints are org-scoped.
 */
export type ProviderResourceLink = {
    /** Provider (user) identifier. */
    userId: string;
    /** Resource identifier. */
    resourceId: number;
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
 * Lists resource ids currently assigned to the given provider.
 * @param userId Provider (user) identifier.
 * @returns Array of resource identifiers; empty when none.
 */
export async function listResourceIdsByProvider(userId: string): Promise<number[]> {
    try {
        const { data } = await api.get<number[]>(
            `/provider-resource-access/by-provider/${encodeURIComponent(userId)}`
        );
        return Array.isArray(data) ? data : [];
    } catch (err) {
        handleApiError(err, "Unable to load resource assignments for provider.");
    }
}

/**
 * Assigns a resource to a provider.
 * The checkbox updates immediately in the UI; on failure it is reverted.
 * @param link Provider/resource link payload.
 */
export async function assignProviderResource(link: ProviderResourceLink): Promise<void> {
    try {
        await api.post("/provider-resource-access/assign", link);
    } catch (err) {
        handleApiError(err, "Unable to grant resource access.");
    }
}

/**
 * Removes a resource from a provider.
 * The checkbox updates immediately in the UI; on failure it is reverted.
 * @param link Provider/resource link payload.
 */
export async function unassignProviderResource(link: ProviderResourceLink): Promise<void> {
    try {
        await api.post("/provider-resource-access/unassign", link);
    } catch (err) {
        handleApiError(err, "Unable to remove resource access.");
    }
}
