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
 * User details returned for administration screens.
 */
export type UserDto = UserFull & { roles: string[] };

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

/**
 * Retrieves all users in the organization with their current roles.
 * @returns Array of user details.
 */
export async function getUsers(): Promise<UserDto[]> {
    const { data } = await api.get<UserDto[]>("/users");
    return data;
}

/**
 * Adds a role to the specified user.
 * @param userId - Target user identifier.
 * @param role - Role name to add.
 */
export async function addUserRole(userId: string, role: string): Promise<void> {
    await api.post(`/users/${userId}/roles/${role}`);
}

/**
 * Removes a role from the specified user.
 * @param userId - Target user identifier.
 * @param role - Role name to remove.
 */
export async function removeUserRole(userId: string, role: string): Promise<void> {
    await api.delete(`/users/${userId}/roles/${role}`);
}
