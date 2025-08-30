import { api } from "@auth/axios";

/**
 * Lightweight client projection for selectors and quick lookups.
 * Mirrors `ClientLiteDto` (Id, Name).
 */
export type ClientSearchItem = {
    /** Client user identifier. */
    id: string;
    /** Display name (FullName if present; otherwise UserName or Email). */
    name: string;
};

/**
 * Searches for clients by name or email.
 * Maps to `GET /users/clients-lite` with `q` and optional `take` parameters.
 *
 * @param query - Free-text search term (matched against full name, email, or username depending on server).
 * @param opts - Optional request options.
 * @returns Matching lightweight client rows for selection UIs.
 */
export async function searchClients(
    query = "",
    opts?: { take?: number; signal?: AbortSignal }
): Promise<ClientSearchItem[]> {
    const params: Record<string, string | number> = {};
    if (query.trim()) params.q = query.trim();

    // Keep in sync with server clamp (1..500); omit if undefined to use server default.
    if (typeof opts?.take === "number") {
        const clamped = Math.max(1, Math.min(500, Math.floor(opts.take)));
        params.take = clamped;
    }

    const { data } = await api.get<ClientSearchItem[]>("/users/clients-lite", {
        params,
        signal: opts?.signal,
    });

    return data;
}
