import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Convert an ISO-8601 UTC string into a DayPilot.Date holding the same local time.
 */
export function utcIsoToDayPilotLocal(utcIso: string): DayPilot.Date {
    return new DayPilot.Date(new Date(utcIso), /*isLocal=*/true);
}
