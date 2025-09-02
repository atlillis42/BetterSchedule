import { api } from "@auth/axios";

/**
 * Minimal user representation used in various selectors.
 * For providers, this also includes `availabilityPublic` (see `ProviderLiteDto`).
 */
export type UserLite = {
    /** User identifier. */
    id: string;
    /** Display name (FullName if present; otherwise UserName or Email). */
    name: string;
    /**
     * When `true` and the user has the ServiceProvider role,
     * clients may view this provider’s availability.
     * Present on provider lists; server supplies `availabilityPublic`.
     */
    availabilityPublic?: boolean;
};

/**
 * Full user representation including optional username and email.
 */
export type UserFull = UserLite & {
    /** Username (nullable). */
    userName?: string | null;
    /** Email (nullable). */
    email?: string | null;
};

/**
 * User details returned for administration screens, including current roles.
 * Mirrors server `UserDto` (Id, Name, UserName, Email, Roles).
 */
export type UserDto = UserFull & {
    /** Roles granted to the user. */
    roles: string[];
};

/**
 * Minimal provider listing record.
 * Mirrors server `ProviderLiteDto` (Id, Name, AvailabilityPublic).
 */
export type ProviderLite = {
    /** Provider user identifier. */
    id: string;
    /** Display name. */
    name: string;
    /**
     * When `true`, clients may view this provider’s availability.
     * Mirrors `ApplicationUser.AvailabilityPublic`.
     */
    availabilityPublic: boolean;
};

/**
 * Provider record with optional username/email details.
 * Mirrors server `ProviderDto` (Id, Name, UserName, Email, AvailabilityPublic).
 */
export type ProviderFull = ProviderLite & {
    /** Username (nullable). */
    userName?: string | null;
    /** Email (nullable). */
    email?: string | null;
};

/**
 * Retrieves a list of providers for selection UIs.
 * Returns `ProviderLiteDto` (includes `availabilityPublic`).
 */
export async function getProvidersLite(): Promise<ProviderLite[]> {
    const { data } = await api.get<ProviderLite[]>("/users/providers-lite");
    return data;
}

/**
 * Retrieves providers with additional details.
 * Maps to `GET /users/providers` with optional search/paging.
 *
 * @param params - Optional search (`q`) and page size (`take`).
 * @returns Provider detail records including `availabilityPublic`.
 */
export async function getProviders(params?: {
    q?: string;
    take?: number;
}): Promise<ProviderFull[]> {
    const query: Record<string, string | number> = {};
    if (params?.q?.trim()) query.q = params.q.trim();
    if (typeof params?.take === "number") {
        const clamped = Math.max(1, Math.min(500, Math.floor(params.take)));
        query.take = clamped;
    }

    const { data } = await api.get<ProviderFull[]>("/users/providers", {
        params: query,
    });
    return data;
}

/**
 * Retrieves all users in the organization with their current roles (Manager-only).
 * Mirrors server `UserDto`.
 */
export async function getUsers(): Promise<UserDto[]> {
    const { data } = await api.get<UserDto[]>("/users");
    return data;
}

/**
 * Adds a role to the specified user (Manager-only).
 * @param userId - Target user identifier.
 * @param role - Role name to add (`Manager` | `ServiceProvider` | `Client`).
 */
export async function addUserRole(userId: string, role: string): Promise<void> {
    await api.post(`/users/${userId}/roles/${role}`);
}

/**
 * Removes a role from the specified user (Manager-only).
 * @param userId - Target user identifier.
 * @param role - Role name to remove (`Manager` | `ServiceProvider` | `Client`).
 */
export async function removeUserRole(
    userId: string,
    role: string
): Promise<void> {
    await api.delete(`/users/${userId}/roles/${role}`);
}
