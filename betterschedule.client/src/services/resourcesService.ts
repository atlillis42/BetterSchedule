import { getResources as apiGetResources } from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";

/**
 * Loads calendar resources for the current organization.
 */
export async function fetchResources(): Promise<CalendarResource[]> {
    return await apiGetResources();
}
