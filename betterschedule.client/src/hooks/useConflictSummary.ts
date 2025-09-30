import { useMemo } from "react";

/**
 * Extracts the "Conflicts with: ..." tail from an API error message.
 * Works with messages like:
 *   "This block overlaps ... Conflicts with: Carla Chen, Tue 9/30 11:00 AM–12:00 PM"
 */
export function useConflictSummary(message?: string | null): string | null {
    return useMemo(() => {
        if (!message) return null;
        const m = message.match(/Conflicts with:\s*([\s\S]+)$/i);
        return m ? m[1].trim() : null;
    }, [message]);
}
