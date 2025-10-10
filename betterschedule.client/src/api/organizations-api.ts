import { api } from "@auth/axios";

/**
 * Minimal organization projection for selection UIs.
 */
export type OrganizationLite = {
    /** Organization identifier. */
    id: string;
    /** Display name. */
    name: string;
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
 * Retrieves organizations (simple search + paging).
 * @param q Optional case-insensitive substring search on name.
 * @param take Optional page size (1–200, default 50 on server).
 */
export async function listOrgs(q?: string, take?: number): Promise<OrganizationLite[]> {
    try {
        const { data } = await api.get<OrganizationLite[]>("/orgs", {
            params: { q, take },
        });
        return data;
    } catch (err) {
        handleApiError(err, "Failed to load organizations.");
    }
}

/**
 * Joins an existing organization as a Client and refreshes auth cookie.
 * @param organizationId Target organization identifier.
 */
export async function joinOrg(organizationId: string): Promise<void> {
    try {
        await api.post(`/orgs/join/${organizationId}`);
    } catch (err) {
        handleApiError(err, "Failed to join organization.");
    }
}

/**
 * Creates a new organization and makes the caller a Manager.
 * @param name New organization name (max 128 chars).
 * @returns The created organization id.
 */
export async function createOrg(name: string): Promise<string> {
    try {
        const { data } = await api.post<{ organizationId: string }>(
            "/orgs/create",
            { name },
            { headers: { "Content-Type": "application/json" } }
        );
        return data.organizationId;
    } catch (err) {
        handleApiError(err, "Failed to create organization.");
    }
}
