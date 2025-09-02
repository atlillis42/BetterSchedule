/**
 * Helpers for `{ code, message }` API error payloads.
 * Works with axios-style `err.response.data`.
 */

type ApiErrorPayload = { code?: string; message?: string };

export function getApiPayload(err: unknown): ApiErrorPayload {
    const anyErr = err as any;
    const data = anyErr?.response?.data;
    if (!data) return {};
    if (typeof data === "string") return { message: data };
    return { code: data?.code, message: data?.message };
}

export function getApiMessage(err: unknown, fallback?: string): string | undefined {
    const { message } = getApiPayload(err);
    if (message) return message;
    const asError = err as any;
    if (typeof asError?.message === "string") return asError.message as string;
    return fallback;
}

export function getApiCode(err: unknown): string | undefined {
    return getApiPayload(err).code;
}

export function throwNormalized(err: unknown, fallback = "Unexpected error"): never {
    const msg = getApiMessage(err, fallback) ?? fallback;
    throw new Error(msg);
}

/**
 * Outside provider availability violations.
 * Uses message heuristics since the server does not emit a dedicated code yet.
 */
export function isOutsideAvailabilityError(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "OUTSIDE_AVAILABILITY" || code === "OUTSIDE_PROVIDER_AVAILABILITY") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes("outside provider availability") || lower.includes("outside availability");
}

/**
 * Inside cancel/change window enforcement.
 * Uses message heuristics since the server does not emit a dedicated code yet.
 */
export function isCancelWindowError(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "INSIDE_CANCEL_WINDOW" || code === "CHANGE_WINDOW") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes("cannot be modified within") || lower.includes("change window") || lower.includes("cancel window");
}

/**
 * Overlap/conflict detection for reservations/blocks.
 * Matches your server codes and common text.
 */
export function isOverlapError(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "RESERVATION_CONFLICT" || code === "BLOCK_OVERLAP" || code === "RESERVATION_OVERLAP") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes("overlap") || lower.includes("conflict");
}

/**
 * Generic "unavailable" slots/resources.
 */
export function isUnavailable(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "UNAVAILABLE") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    return !!msg?.toLowerCase().includes("unavailable");
}

/* Back-compat aliases if older imports exist */
export const isAvailabilityViolation = isOutsideAvailabilityError;
export const isInsideCancelWindow = isCancelWindowError;
export const isConflict = isOverlapError;
