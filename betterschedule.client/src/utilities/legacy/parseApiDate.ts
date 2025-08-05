/**
 * Converts backend API date/time string to JS Date.
 */
export function parseApiDate(apiDateStr: string): Date {
    return new Date(apiDateStr);
}
