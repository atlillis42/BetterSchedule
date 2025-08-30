/**
 * Manager endpoints for Provider ↔ Resource access.
 * - List resource IDs granted to a provider.
 * - Assign/unassign specific resources to a provider.
 */
import { api } from "@auth/axios";
import type {
    AssignProviderResourceRequest,
    UserId,
    ResourceId,
} from "@/types/accessTypes";

type ApiErrorPayload = { code?: string; message?: string };
const handle = (e: any, f: string): never => {
    const p: ApiErrorPayload | undefined = e?.response?.data;
    if (p?.message) throw new Error(p.message);
    throw new Error(f);
};

/** Returns resource IDs a provider may use (org-scoped). */
export async function listResourceIdsByProvider(userId: UserId): Promise<ResourceId[]> {
    try {
        const { data } = await api.get<ResourceId[]>(
            `/provider-resource-access/by-provider/${userId}`
        );
        return data;
    } catch (err: any) {
        handle(err, "Failed to load permitted resources for provider.");
    }
}

/** Assigns a resource to a provider (idempotent; undeletes when needed). */
export async function assignProviderResource(
    body: AssignProviderResourceRequest
): Promise<void> {
    try {
        await api.post<void>("/provider-resource-access/assign", body);
    } catch (err: any) {
        handle(err, "Failed to assign resource to provider.");
    }
}

/** Soft-unassigns a resource from a provider. */
export async function unassignProviderResource(
    body: AssignProviderResourceRequest
): Promise<void> {
    try {
        await api.post<void>("/provider-resource-access/unassign", body);
    } catch (err: any) {
        handle(err, "Failed to unassign resource from provider.");
    }
}
