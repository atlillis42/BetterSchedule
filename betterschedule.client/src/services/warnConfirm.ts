// src/services/warnConfirm.ts

import { Messages } from "@/domain/calendar/messages";
import {
    getReservations,
    createReservationWithWarnings,
    updateReservationWithWarnings,
    type ReservationWarnings,
    type ReservationDto,
    type CreateReservationDto,
    type UpdateReservationDto,
} from "@/api/reservation-api";
import { getBlockedTimes } from "@/api/blockedtime-api";

/**
 * Determines whether two time ranges overlap.
 *
 * @param aStartIso - Start of A (ISO 8601)
 * @param aEndIso - End of A (ISO 8601)
 * @param bStartIso - Start of B (ISO 8601)
 * @param bEndIso - End of B (ISO 8601)
 * @returns True when the half-open intervals [A.start, A.end) and [B.start, B.end) overlap
 * @internal
 */
function overlaps(
    aStartIso: string,
    aEndIso: string,
    bStartIso: string,
    bEndIso: string
): boolean {
    const aStart = new Date(aStartIso).getTime();
    const aEnd = new Date(aEndIso).getTime();
    const bStart = new Date(bStartIso).getTime();
    const bEnd = new Date(bEndIso).getTime();
    return aStart < bEnd && bStart < aEnd;
}

/**
 * Inputs required to preflight a reservation save.
 *
 * @public
 */
export type PreflightInputs = {
    /**
     * Organization settings subset used by client-side enforcement.
     * - `minLeadMinutes`: advance booking lead time
     * - `requireConfirmOnOverrides`: whether UI should prompt for explicit confirmation when a policy is violated
     */
    org: { minLeadMinutes: number; requireConfirmOnOverrides: boolean };

    /**
     * Operation mode: create or update.
     */
    mode: "create" | "update";

    /**
     * Reservation id when updating (enables exclude-self logic for overlap checks).
     */
    id?: number;

    /**
     * Payload subset required by client-side checks and commit.
     * These fields must be present regardless of create/update.
     */
    payload: (CreateReservationDto & Partial<UpdateReservationDto>) & {
        serviceProviderId: string;
        startTime: string;
        endTime: string;
        resourceId?: number | null;
    };
};

/**
 * Performs client-side preflight checks using visible data:
 * - Lead-time (based on local clock)
 * - Provider/resource overlap against visible reservations
 * - Resource block collisions
 *
 * Provider-blocked windows are not reliably derivable from client DTOs;
 * the server will emit a header post-commit and we surface that later.
 *
 * @param inputs - See {@link PreflightInputs}
 * @returns Partial {@link ReservationWarnings} reflecting client-side findings
 * @public
 */
export async function preflightReservation(inputs: PreflightInputs): Promise<ReservationWarnings> {
    const { org, mode, id, payload } = inputs;

    const now = Date.now();
    const leadMs = (org?.minLeadMinutes ?? 0) * 60_000;
    const leadTime = new Date(payload.startTime).getTime() - now < leadMs;

    const windowStart = payload.startTime;
    const windowEnd = payload.endTime;

    // Visible reservations in the window (subject to server-side visibility)
    const reservations = await getReservations({ start: windowStart, end: windowEnd });

    const sameProviderOverlap = reservations.some((r: ReservationDto) => {
        if (mode === "update" && id && r.id === id) return false;
        return (
            r.serviceProviderId === payload.serviceProviderId &&
            overlaps(r.startTime, r.endTime, windowStart, windowEnd)
        );
    });

    const resourceId = payload.resourceId ?? undefined;
    const sameResourceOverlap =
        resourceId != null
            ? reservations.some((r: ReservationDto) => {
                if (mode === "update" && id && r.id === id) return false;
                return (
                    (r.resourceId ?? undefined) === resourceId &&
                    overlaps(r.startTime, r.endTime, windowStart, windowEnd)
                );
            })
            : false;

    // Resource blocks (provider blocks are handled server-side via headers)
    const blocks = await getBlockedTimes({ start: windowStart, end: windowEnd });
    const resourceBlocked =
        resourceId != null
            ? blocks.some((b) => (b.resourceId ?? undefined) === resourceId && overlaps(b.startTime, b.endTime, windowStart, windowEnd))
            : false;

    return {
        leadTime,
        doubleBooking: sameProviderOverlap || sameResourceOverlap,
        resourceBlocked,
        // providerBlocked: derived from server headers post-commit
    };
}

/**
 * Builds a single confirmation prompt string from the provided warnings and
 * shows a modal confirmation (blocking). If no warnings exist, returns true.
 *
 * @param flags - Warning flags from preflight
 * @returns True if the user confirmed (or no warnings); false otherwise
 * @public
 */
export function confirmWarnings(flags: ReservationWarnings): boolean {
    const parts: string[] = [];
    if (flags.leadTime) parts.push(Messages.ConfirmLeadTimeOverride);
    if (flags.providerBlocked || flags.resourceBlocked) parts.push(Messages.ConfirmBlocked);
    if (flags.doubleBooking) parts.push(Messages.ConfirmDoubleBook);
    if (parts.length === 0) return true;

    // Consolidate to one prompt to reduce click-fatigue.
    return window.confirm(parts.join("\n"));
}

/**
 * Saves a reservation with preflight checks and (optional) confirmation.
 *
 * Behavior:
 * - Runs {@link preflightReservation} to compute client-visible warnings.
 * - If `org.requireConfirmOnOverrides` is true (or `requireConfirmOverride` is set),
 *   shows a consolidated confirmation dialog when any warnings are present.
 * - Commits via server API:
 *   - `createReservationWithWarnings` for create
 *   - `updateReservationWithWarnings` for update
 * - After commit, merges preflight and server header warnings to decide which
 *   informational toasts to emit via `onWarn`.
 *
 * Notes:
 * - This function does not directly toast; the caller controls UX via callbacks.
 * - Provider-blocked warnings can only be sourced from server headers.
 *
 * @param args - Inputs, with optional UX callbacks
 * @returns Created dto for create; `void` for update
 * @throws Error on server validation/conflict failures
 * @public
 */
export async function saveReservationWithConfirm(args: PreflightInputs & {
    /**
     * Force enable/disable confirmation independent of org settings
     * (useful for tests or advanced flows).
     */
    requireConfirmOverride?: boolean;

    /**
     * Called on successful commit; receives a short description string.
     */
    onSuccess?: (msg: string) => void;

    /**
     * Called to surface post-commit informational warnings (e.g., toasts).
     */
    onWarn?: (msg: string) => void;
}): Promise<ReservationDto | void> {
    const { org, mode, id, payload, requireConfirmOverride, onSuccess, onWarn } = args;

    const pre = await preflightReservation({ org, mode, id, payload });
    const requireConfirm = requireConfirmOverride ?? !!org?.requireConfirmOnOverrides;

    if (requireConfirm) {
        const ok = confirmWarnings(pre);
        if (!ok) return;
    }

    if (mode === "create") {
        const { data, warnings } = await createReservationWithWarnings(payload as CreateReservationDto);
        onSuccess?.("Reservation created.");
        postCommitWarnToasts({ pre, headers: warnings, onWarn });
        return data;
    } else {
        const { warnings } = await updateReservationWithWarnings(id!, payload as UpdateReservationDto);
        onSuccess?.("Reservation updated.");
        postCommitWarnToasts({ pre, headers: warnings, onWarn });
        return;
    }
}

/**
 * Emits informational notices based on a merge of preflight flags and
 * server header warnings (server signals take precedence).
 *
 * @param args.pre - Client-side preflight flags
 * @param args.headers - Server header warnings
 * @param args.onWarn - Callback used to surface messages (e.g., toasts)
 * @internal
 */
function postCommitWarnToasts(args: {
    pre: ReservationWarnings;
    headers: ReservationWarnings;
    onWarn?: (msg: string) => void;
}) {
    const { pre, headers, onWarn } = args;

    const doubleBook = headers.doubleBooking ?? pre.doubleBooking;
    const providerBlocked = headers.providerBlocked ?? false;
    const resourceBlocked = headers.resourceBlocked ?? pre.resourceBlocked;
    const lead = headers.leadTime ?? pre.leadTime;

    if (doubleBook) onWarn?.(Messages.WarnDoubleBook);
    // Optional informational notices (comment out if too chatty for production):
    if (providerBlocked) onWarn?.("Provider has a blocked window at this time.");
    if (resourceBlocked) onWarn?.("Resource is blocked at this time.");
    if (lead) onWarn?.("Saved within lead-time (override applied).");
}
