import { api } from "@auth/axios";

/**
 * Minimal user representation.
 */
export type UserLite = { id: string; name: string };

/**
 * Full user representation including optional username and email.
 */
export type UserFull = UserLite & { userName?: string | null; email?: string | null };

/**
 * Retrieves a list of providers with minimal information.
 * @returns Array of provider summaries.
 */
export async function getProvidersLite(): Promise<UserLite[]> {
    const { data } = await api.get<UserLite[]>("/users/providers-lite");
    return data;
}

/**
 * Retrieves providers with additional details.
 * @param params - Optional search and pagination values.
 * @returns Array of provider details.
 */
export async function getProviders(params?: { q?: string; take?: number }): Promise<UserFull[]> {
    const { data } = await api.get<UserFull[]>("/users/providers", { params });
    return data;
}
