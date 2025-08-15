import { api } from "@auth/axios";

/**
 * Result item returned when searching for clients.
 */
export type ClientSearchItem = { id: string; name: string };

/**
 * Searches for clients by name or email.
 * @param query - Search term.
 * @param opts - Optional request options such as an abort signal.
 * @returns Matching clients.
 */
export async function searchClients(
    query = "",
    opts?: { signal?: AbortSignal }
): Promise<ClientSearchItem[]> {
    const params: Record<string, string> = {};
    if (query.trim()) params.search = query.trim();

    const { data } = await api.get<ClientSearchItem[]>("/clients", {
        params,
        signal: opts?.signal,
    });

    return data;
}
