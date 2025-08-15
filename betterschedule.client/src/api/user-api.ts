import { api } from "@auth/axios";

export type UserLite = { id: string; name: string };
export type UserFull = UserLite & { userName?: string | null; email?: string | null };

export async function getProvidersLite(): Promise<UserLite[]> {
    const { data } = await api.get<UserLite[]>("/users/providers-lite");
    return data;
}

export async function getProviders(params?: { q?: string; take?: number }): Promise<UserFull[]> {
    const { data } = await api.get<UserFull[]>("/users/providers", { params });
    return data;
}
