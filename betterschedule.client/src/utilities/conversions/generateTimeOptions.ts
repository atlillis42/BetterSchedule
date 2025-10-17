/**
 * Generates 24-hour time strings at fixed minute steps, e.g. "09:00", "09:15", ...
 * @param stepMinutes - Step size in minutes (default 15). Must evenly divide 60.
 * @returns Array of "HH:MM" strings sorted from "00:00" to "23:45".
 */
export function generateTimeOptions(stepMinutes: number = 15): string[] {
    const times: string[] = [];
    const minutesPerHour = 60;

    if (minutesPerHour % stepMinutes !== 0) {
        throw new Error(`stepMinutes must evenly divide 60; received ${stepMinutes}`);
    }

    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < minutesPerHour; minute += stepMinutes) {
            const hh = hour.toString().padStart(2, "0");
            const mm = minute.toString().padStart(2, "0");
            times.push(`${hh}:${mm}`);
        }
    }
    return times;
}
