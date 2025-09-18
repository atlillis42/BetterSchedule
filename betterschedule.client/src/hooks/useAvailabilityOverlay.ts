import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOverlayAvailabilityMap, type AvailabilityMap } from "@/services/availabilityService";

/**
 * Provider availability overlay state.
 *
 * Responsibilities:
 * - Holds the currently targeted provider for availability shading (or `undefined` for off).
 * - Auto-selects `initialProviderId` exactly once when no user choice has been made.
 * - Fetches availability rules for the selected provider into a map.
 *
 * Conventions:
 * - A user “choice” is any explicit call to `setOverlayProviderId(...)` from the UI.
 * - If `initialProviderId` appears later (e.g., after auth), it is applied only when
 *   the overlay is still `undefined` and the user hasn’t chosen anything yet.
 */
export function useAvailabilityOverlay(initialProviderId?: string) {
    /** Currently selected provider id for overlay (undefined = off). */
    const [overlayProviderId, setOverlayProviderIdState] = useState<string | undefined>(initialProviderId);

    /** Availability rules keyed by provider id (used by shading callbacks). */
    const [availabilityByProvider, setAvailabilityByProvider] = useState<AvailabilityMap>(new Map());

    /** True while a fetch is in-flight for the current overlay selection. */
    const [loading, setLoading] = useState(false);

    /** Tracks whether the user has explicitly chosen an overlay target. */
    const [userTouched, setUserTouched] = useState(false);

    /**
     * Public setter used by UI components.
     * Marks the state as user-driven and updates the overlay target.
     */
    const setOverlayProviderId = useCallback((id?: string) => {
        setUserTouched(true);
        setOverlayProviderIdState(id);
    }, []);

    /**
     * Apply the `initialProviderId` once if:
     * - it exists,
     * - there is no current selection,
     * - and the user hasn’t chosen anything yet.
     */
    useEffect(() => {
        if (initialProviderId && overlayProviderId === undefined && !userTouched) {
            setOverlayProviderIdState(initialProviderId);
        }
    }, [initialProviderId, overlayProviderId, userTouched]);

    /**
     * Fetch availability rules whenever the overlay target changes.
     * Clears the map when overlay is turned off.
     */
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                if (!overlayProviderId) {
                    if (!cancelled) setAvailabilityByProvider(new Map());
                    return;
                }
                if (!cancelled) setLoading(true);
                const map = await fetchOverlayAvailabilityMap(overlayProviderId);
                if (!cancelled) setAvailabilityByProvider(map);
            } catch (err) {
                // Surface via console; UI can choose to show a toast based on `loading` + empty map.
                // (Avoids coupling the hook to a specific toast system.)
                // eslint-disable-next-line no-console
                console.error("Availability fetch failed", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [overlayProviderId]);

    return useMemo(
        () => ({ overlayProviderId, setOverlayProviderId, availabilityByProvider, loading }),
        [overlayProviderId, setOverlayProviderId, availabilityByProvider, loading]
    );
}
