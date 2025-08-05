/**
 * Returns a color string for a given event type, status, or resource.
 * Extend this as needed!
 */
export function getEventColor({
    type,
    status,
    resourceId,
}: {
    type?: "reservation" | "blockedTime";
    status?: string;
    resourceId?: number | string;
}): string {
    if (type === "blockedTime") return "#e5e7eb"; // gray
    if (type === "reservation") return "#c7d2fe"; // blue
    // Add logic for status or resource color overrides if needed
    return "#d1d5db"; // default gray
}
