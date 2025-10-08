import { getProviderLiteById, type ProviderLite } from "@/api/user-api";

/**
 * In-memory cache for provider display names keyed by user id (GUID).
 * Lives for the lifespan of the JS runtime (page/session).
 * Add TTL/invalidation if you expect frequent renames while the app is open.
 */
const cache = new Map<string, string>();

/** Synchronous read; returns undefined if not cached or id is falsy. */
export function peekProviderName(id?: string | null): string | undefined {
    if (!id) return undefined;
    return cache.get(id);
}

/**
 * Resolves a provider display name by id using a local cache.
 * Falls back to the id on failure (to avoid blank UI).
 *
 * @param id - Provider user identifier (GUID).
 * @returns Display name (cached or fetched).
 */
export async function getProviderNameCached(id?: string | null): Promise<string> {
    if (!id) return "";
    const hit = cache.get(id);
    if (hit) return hit;

    try {
        const dto = await getProviderLiteById(id);
        const name = dto?.name || id;
        cache.set(id, name);
        return name;
    } catch {
        // Cache the id so we don't keep retrying on every render
        cache.set(id, id);
        return id;
    }
}

/**
 * Seeds/updates the cache with a known mapping.
 * Useful when you already have (id, name) pairs from a list endpoint.
 */
export function primeProviderName(id: string, name: string): void {
    if (!id) return;
    cache.set(id, name || id);
}

/**
 * Bulk prime convenience:
 * - Accepts an array of ProviderLite,
 *   OR tuples [id, name],
 *   OR objects { id, name }.
 */
export function primeProviderNames(
    entries:
        | ReadonlyArray<ProviderLite>
        | ReadonlyArray<readonly [string, string]>
        | ReadonlyArray<{ id: string; name: string }>
): void {
    for (const item of entries) {
        if (Array.isArray(item)) {
            const [id, name] = item;
            if (id) cache.set(id, name || id);
        } else if ("availabilityPublic" in (item as ProviderLite)) {
            const p = item as ProviderLite;
            if (p.id) cache.set(p.id, p.name || p.id);
        } else {
            const o = item as { id: string; name: string };
            if (o.id) cache.set(o.id, o.name || o.id);
        }
    }
}

/** Targeted invalidation for a specific provider id. */
export function deleteProviderName(id: string): void {
    if (!id) return;
    cache.delete(id);
}

/** Clears all entries. Prefer targeted invalidation if feasible. */
export function clearProviderNameCache(): void {
    cache.clear();
}
