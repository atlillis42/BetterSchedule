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
 * Inside cancel/change window enforcement.
 * Matches server code and common text.
 */
export function isCancelWindowError(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "INSIDE_CANCEL_WINDOW") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return (
        lower.includes("cannot cancel after the reservation start time") ||
        lower.includes("inside the organization’s change window") ||
        lower.includes("inside the organization's change window") ||
        lower.includes("change window") ||
        lower.includes("cancel window")
    );
}

/**
 * Overlap/conflict detection for reservations/blocks.
 * Matches current server codes and common text.
 */
export function isOverlapError(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "RESERVATION_CONFLICT" || code === "BLOCK_OVERLAP") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes("overlap") || lower.includes("conflict") || lower.includes("blocked");
}

/**
 * Generic “unavailable” slots/resources.
 * Back-compat: treat reservation conflicts as unavailable for UI purposes.
 */
export function isUnavailable(errOrMsg: unknown): boolean {
    const code = typeof errOrMsg === "string" ? undefined : getApiCode(errOrMsg);
    if (code === "RESERVATION_CONFLICT" || code === "UNAVAILABLE") return true;
    const msg = typeof errOrMsg === "string" ? errOrMsg : getApiMessage(errOrMsg);
    return !!msg?.toLowerCase().includes("unavailable");
}
