/**
 * Utilities for parsing and formatting Retry-After data from HTTP 429 responses.
 * These helpers prioritize the HTTP header, then fall back to the JSON body.
 */

/**
 * Attempts to extract Retry-After seconds from an Axios-style error object.
 * @param error An error thrown by Axios (or compatible shape).
 * @returns Number of seconds until retry, or null if unavailable.
 */
export function parseRetryAfterSeconds(error: unknown): number | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = error as any;
    const headerVal = anyErr?.response?.headers?.["retry-after"];
    const bodyVal = anyErr?.response?.data?.retryAfterSeconds;

    // Try header first (string -> number)
    if (headerVal != null) {
        const fromHeader = Number(headerVal);
        if (Number.isFinite(fromHeader) && fromHeader >= 0) {
            return fromHeader;
        }
    }

    // Then try body (already a number)
    if (typeof bodyVal === "number" && Number.isFinite(bodyVal) && bodyVal >= 0) {
        return bodyVal;
    }

    return null;
}

/**
 * Converts seconds into a human-friendly string.
 * - >= 60 seconds: rounds up to whole minutes (e.g., 61 -> "2 minutes")
 * - < 60 seconds: shows whole seconds (e.g., 30 -> "30 seconds")
 * @param seconds Number of seconds, or null if unknown.
 * @returns A friendly phrase like "a bit", "45 seconds", or "2 minutes".
 */
export function formatRetryAfterHuman(seconds: number | null): string {
    if (seconds == null) return "a bit";
    if (seconds < 60) {
        const whole = Math.ceil(seconds);
        return whole === 1 ? "1 second" : `${whole} seconds`;
    }
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * Convenience: directly formats the retry-after message from an Axios error.
 * @param error Axios-style error object.
 * @returns A friendly phrase suitable for UI.
 */
export function formatRetryAfterFromError(error: unknown): string {
    return formatRetryAfterHuman(parseRetryAfterSeconds(error));
}
