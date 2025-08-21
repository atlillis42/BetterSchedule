import { api } from "@auth/axios";
import type {
    ProviderAvailabilityDto,
    CreateProviderAvailabilityDto,
    UpdateProviderAvailabilityDto,
    UpsertProviderAvailabilityDto,
} from "@/types/providerAvailabilityTypes";

export async function listAvailability(providerId?: string) {
    const resp = await api.get<ProviderAvailabilityDto[]>("/provider-availability", {
        params: providerId ? { providerId } : undefined,
    });
    return resp.data;
}

export async function getAvailability(id: number) {
    const resp = await api.get<ProviderAvailabilityDto>(`/provider-availability/${id}`);
    return resp.data;
}

export async function ensureDefaultAvailability(providerId: string) {
    const resp = await api.post<{ created: boolean; count: number }>(
        `/provider-availability/providers/${providerId}/ensure-default`
    );
    return resp.data;
}

export async function createAvailability(payload: CreateProviderAvailabilityDto) {
    const resp = await api.post<ProviderAvailabilityDto>("/provider-availability", payload);
    return resp.data;
}

export async function updateAvailability(id: number, payload: UpdateProviderAvailabilityDto) {
    await api.put<void>(`/provider-availability/${id}`, payload);
}

export async function deleteAvailability(id: number) {
    await api.delete<void>(`/provider-availability/${id}`);
}

export async function upsertAvailability(payload: UpsertProviderAvailabilityDto) {
    const resp = await api.post<ProviderAvailabilityDto>("/provider-availability/upsert", payload);
    return resp.data;
}
