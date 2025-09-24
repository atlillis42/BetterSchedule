import { getClientLiteById } from "@/api/client-api";

/**
 * In-memory cache for client display names keyed by user id (GUID).
 * Keeps event renders/hover tooltips snappy and avoids repeat fetches.
 *
 * This cache lives for the lifespan of the JS runtime (page/session).
 * Add TTL if you expect frequent renames while the app is open.
 */
const cache = new Map<string, string>();


/** Synchronous read; returns undefined if not cached. */
export function peekClientName(id?: string): string | undefined {
    if (!id) return undefined;
    return cache.get(id);
}

/**
 * Resolves a client display name by id using a local cache.
 * Falls back to the id on failure (to avoid blank UI).
 *
 * @param id - Client user identifier (GUID).
 * @returns Display name (cached or fetched).
 */
export async function getClientNameCached(id?: string): Promise<string> {
    if (!id) return "";
    const hit = cache.get(id);
    if (hit) return hit;
    try {
        const dto = await getClientLiteById(id);
        const name = dto?.name || id;
        cache.set(id, name);
        return name;
    } catch {
        cache.set(id, id);
        return id;
    }
}

/**
 * Seeds/updates the cache with a known mapping.
 * Useful when you already have (id,name) pairs from a list endpoint.
 */
export function primeClientName(id: string, name: string): void {
  cache.set(id, name);
}

/** Clears all entries. Prefer targeted invalidation if feasible. */
export function clearClientNameCache(): void {
  cache.clear();
}
