import { api } from "@auth/axios";
import type { AssignProviderResourceRequest, UserId, ResourceId } from "@/types/accessTypes";

export async function listResourceIdsByProvider(userId: UserId): Promise<ResourceId[]> {
    const { data } = await api.get<ResourceId[]>(`/provider-resource-access/by-provider/${userId}`);
    return data;
}
export async function assignProviderResource(body: AssignProviderResourceRequest): Promise<void> {
    await api.post<void>("/provider-resource-access/assign", body);
}
export async function unassignProviderResource(body: AssignProviderResourceRequest): Promise<void> {
    await api.post<void>("/provider-resource-access/unassign", body);
}