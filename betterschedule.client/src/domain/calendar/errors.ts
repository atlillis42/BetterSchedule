/**
 * Helpers for `{ code, message }` API error payloads.
 * @remarks
 * - Avoids brittle string matching scattered through UI code.
 * - Works with axios-style `err.response.data`.
 */
type ApiErrorPayload = { code?: string; message?: string };

/**
 * Extracts `{ code, message }` from an unknown error.
 */
export function getApiPayload(err: unknown): ApiErrorPayload {
    const anyErr = err as any;
    const data = anyErr?.response?.data;
    if (!data) return {};
    if (typeof data === "string") return { message: data };
    return { code: data?.code, message: data?.message };
}

/**
 * Returns a user-facing message with optional fallback.
 */
export function getApiMessage(err: unknown, fallback?: string): string | undefined {
    const p = getApiPayload(err);
    if (p.message) return p.message;
    if ((err as any)?.message) return (err as any).message as string;
    return fallback;
}

/**
 * Returns an API error code, if present.
 */
export function getApiCode(err: unknown): string | undefined {
    return getApiPayload(err).code;
}

/**
 * Throws a normalized `Error(message)` using API shape or fallback.
 */
export function throwNormalized(err: unknown, fallback = "Unexpected error"): never {
    const msg = getApiMessage(err, fallback) ?? fallback;
    throw new Error(msg);
}

/**
 * True when the error indicates an availability violation.
 * Matches `{ code: "OUTSIDE_AVAILABILITY" }` and common messages.
 */
export function isAvailabilityViolation(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "OUTSIDE_AVAILABILITY") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    return !!msg?.toLowerCase().includes("outside provider availability");
}

/**
 * True when the error indicates a generic “unavailable” slot/resource.
 */
export function isUnavailable(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "UNAVAILABLE") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    return !!msg?.toLowerCase().includes("unavailable");
}

/**
 * True when the error indicates change/cancel-window enforcement.
 */
export function isInsideCancelWindow(errOrMsg: unknown): boolean {
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    return !!msg?.toLowerCase().includes("cannot be modified within");
}

/**
 * True when the error indicates an overlap conflict (block/reservation).
 */
export function isConflict(err: unknown): boolean {
    const code = getApiCode(err);
    return code === "RESERVATION_CONFLICT" || code === "BLOCK_OVERLAP";
}
