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

/** Strong (runtime-driven) role name. */
export type RoleName = string;

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

/** Lightweight projection used by async provider search controls. */
export type ProviderSearchItem = {
    id: string;
    name: string;
    availabilityPublic?: boolean;
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
 * Resolves a single provider by ID (GUID) to a lightweight display record.
 * Maps to `GET /users/providers-lite/{id}`.
 *
 * @param id - Provider user identifier (GUID).
 * @returns A `ProviderLite` with display name and `availabilityPublic`.
 */
export async function getProviderLiteById(id: string): Promise<ProviderLite> {
    const { data } = await api.get<ProviderLite>(
        `/users/providers-lite/${encodeURIComponent(id)}`
    );
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
 * Async search for providers (mirrors client search pattern).
 * Maps to `GET /users/providers` with `q` and optional `take`.
 *
 * @param query - Free text (name/email/username depending on server).
 * @param opts  - Optional { take, signal }.
 * @returns Lightweight search items for react-select/async.
 */
export async function searchProviders(
    query = "",
    opts?: { take?: number; signal?: AbortSignal }
): Promise<ProviderSearchItem[]> {
    const params: Record<string, string | number> = {};
    if (query.trim()) params.q = query.trim();

    if (typeof opts?.take === "number") {
        const clamped = Math.max(1, Math.min(500, Math.floor(opts.take)));
        params.take = clamped;
    }

    const { data } = await api.get<ProviderFull[]>("/users/providers", {
        params,
        signal: opts?.signal,
    });

    return data.map((p) => ({
        id: p.id,
        name: p.name,
        availabilityPublic: p.availabilityPublic,
    }));
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
 * @param role - Role name to add.
 */
export async function addUserRole(userId: string, role: RoleName): Promise<void> {
    await api.post(`/users/${userId}/roles/${encodeURIComponent(role)}`);
}

/**
 * Removes a role from the specified user (Manager-only).
 * @param userId - Target user identifier.
 * @param role - Role name to remove.
 */
export async function removeUserRole(
    userId: string,
    role: RoleName
): Promise<void> {
    await api.delete(`/users/${userId}/roles/${encodeURIComponent(role)}`);
}

/**
 * Retrieves the list of allowed role names for the current organization.
 * Maps to `GET /users/roles`.
 *
 * @returns Array of role names (e.g., ["Manager","ServiceProvider","Client"]).
 */
export async function getAvailableRoles(): Promise<RoleName[]> {
    const { data } = await api.get<RoleName[]>("/users/roles");
    return data;
}
