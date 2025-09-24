import { getAppointmentType } from "@/api/appointmenttype-api";

/**
 * In-memory cache for appointment type names.
 * Keeps network traffic low during calendar renders and list views.
 *
 * - Keyed by numeric appointmentTypeId.
 * - Stores only the display name.
 * - Optional TTL can be added later; current version is non-expiring for session lifetime.
 */

const cache = new Map<number, string>();

/**
 * Resolves the human-readable appointment type name for a given id, using a local cache.
 * Falls back to `"Type #<id>"` when the API is unavailable.
 *
 * @param id - Appointment type identifier.
 * @returns A promise that resolves to the display name.
 */
export async function getAppointmentTypeNameCached(id: number): Promise<string> {
    if (cache.has(id)) return cache.get(id)!;

    try {
        const dto = await getAppointmentType(id);
        const name = dto?.name ?? `Type #${id}`;
        cache.set(id, name);
        return name;
    } catch {
        const fallback = `Type #${id}`;
        cache.set(id, fallback);
        return fallback;
    }
}

/**
 * Seeds the cache with a known mapping. Useful after bulk loads/lists.
 *
 * @param id - Appointment type identifier.
 * @param name - Display name to store.
 */
export function primeAppointmentTypeName(id: number, name: string): void {
    cache.set(id, name);
}

/**
 * Clears all cached appointment type names.
 * Prefer targeted invalidation if you know what changed.
 */
export function clearAppointmentTypeCache(): void {
    cache.clear();
}
