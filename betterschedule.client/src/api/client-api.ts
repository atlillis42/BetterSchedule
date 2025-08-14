// Purpose: lightweight search for the client picker (id + name only).
import { api } from "@auth/axios";

export type ClientSearchItem = { id: string; name: string };

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
