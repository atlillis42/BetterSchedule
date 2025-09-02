import { useEffect, useState } from "react";
import { fetchOverlayAvailabilityMap, type AvailabilityMap } from "@/services/availabilityService";

/**
 * Manages overlay provider state and fetches availability rules for shading/disable.
 * @param initialProviderId Initial provider id for overlay.
 * @returns Overlay provider id, setter, and availability map.
 */
export function useAvailabilityOverlay(initialProviderId?: string) {
    const [overlayProviderId, setOverlayProviderId] = useState<string | undefined>(initialProviderId);
    const [availabilityByProvider, setAvailabilityByProvider] = useState<AvailabilityMap>(new Map());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!overlayProviderId) {
                    if (!cancelled) setAvailabilityByProvider(new Map());
                    return;
                }
                const map = await fetchOverlayAvailabilityMap(overlayProviderId);
                if (!cancelled) setAvailabilityByProvider(map);
            } catch (err) {
                console.error("⛔ Availability fetch failed", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [overlayProviderId]);

    return { overlayProviderId, setOverlayProviderId, availabilityByProvider };
}
