import { getProvidersLite } from "@/api/user-api";
import type { UiEvent } from "@/types/calendarDataTypes";

/** Lightweight provider shape used by calendar UI. */
export type ProviderLite = { id: string; name: string; availabilityPublic?: boolean };

/**
 * Attempts to load providers from the API; falls back to deriving ids from events.
 * @param events Events to derive from if the API returns nothing or fails.
 */
export async function getProvidersOrDerive(events: UiEvent[]): Promise<ProviderLite[]> {
    try {
        const apiList = await getProvidersLite();
        if (apiList && apiList.length > 0) return apiList;
    } catch {
        /* derive below */
    }
    return deriveProvidersFromEvents(events);
}

/**
 * Derives a provider list from existing events by unique serviceProviderId.
 * @param events Source events.
 */
export function deriveProvidersFromEvents(events: UiEvent[]): ProviderLite[] {
    const ids = Array.from(
        new Set(
            events
                .map((e) => e?.reservation?.serviceProviderId as string | undefined)
                .filter(Boolean) as string[]
        )
    );
    return ids.map((id) => ({ id, name: id }));
}
