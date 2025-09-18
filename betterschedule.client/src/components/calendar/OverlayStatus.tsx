import React from "react";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";

type AvailabilityMap = Map<string, ProviderAvailabilityDto[]>;

/**
 * Compact overlay state readout and user hints.
 * - Shows loading when fetching rules.
 * - Warns when the selected provider has no rules.
 * - In DEV, prints overlay id + rule count for quick debugging.
 */
export function OverlayStatus(props: {
  overlayProviderId?: string;
  availabilityByProvider: AvailabilityMap;
  loading: boolean;
  orgTimeZoneId?: string;
}) {
  const { overlayProviderId, availabilityByProvider, loading, orgTimeZoneId } = props;
  const rules = overlayProviderId ? availabilityByProvider.get(overlayProviderId) : undefined;
  const count = rules?.length ?? 0;

  if (loading && overlayProviderId) {
    return (
      <div className="px-3 py-2 text-xs text-gray-600" role="status">
        Loading availability…
      </div>
    );
  }

  const noData = !!overlayProviderId && count === 0;

  return (
    <div className="px-3 py-2 text-xs">
      {noData ? (
        <div className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
          No saved availability found for the selected provider. Use “Provider Availability” to add rules.
        </div>
      ) : (
        import.meta.env.DEV && (
          <div className="text-gray-600">
            Overlay: <b>{overlayProviderId ?? "(off)"}</b> • Rules: <b>{count}</b>
            {orgTimeZoneId ? <> • Org TZ: <b>{orgTimeZoneId}</b></> : null}
          </div>
        )
      )}
    </div>
  );
}
