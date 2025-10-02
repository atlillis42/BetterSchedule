/**
 * @file Creates a DayPilot `onBeforeEventRender` handler dedicated to shaping
 *       reservation and blocked-time visual presentation (CSS class, tooltip, HTML).
 *       It deliberately avoids inline color props so CSS themes/overrides control visuals.
 */

import {
    classForReservationStatus,
    colorForReservationStatus, // retained for consumers; not used directly to avoid inline styles
    tooltipForReservation,
} from "@/domain/calendar/eventStyle";

/**
 * Lightweight shape for DayPilot's callback args (kept permissive to avoid hard dependency).
 */
type BeforeEventRenderArgs = {
    e?: any;
    data?: any;
    control?: { update?: () => void } | any;
};

/**
 * Options for the renderer factory.
 */
export type BeforeEventRenderOptions = {
    /**
     * Resolve an appointment type display name from its numeric id (sync).
     */
    getTypeLabel?: (id?: number) => string | undefined;
    /**
     * Resolve a client display name if already cached (sync).
     */
    getClientLabelSync?: (id?: string) => string | undefined;
    /**
     * Optionally prime/fetch a missing client label (async). If it resolves,
     * the control will be refreshed once to show updated labels.
     */
    primeClient?: (id: string) => Promise<unknown> | void;
};

/**
 * Creates a DayPilot `onBeforeEventRender` handler focused on presentation:
 * - Assigns CSS classes (e.g., `ev-reservation` + status class).
 * - Provides compact tooltips.
 * - Emits structured HTML (3-line block) for the event body.
 *
 * It intentionally does not set inline colors (e.g., `backColor`, `barColor`) so that
 * your CSS (`calendar-overrides.css`) defines the canonical visuals. The only side effect
 * is an optional cache prime for client labels, followed by a single safe control refresh.
 *
 * @param opts Optional label resolvers and priming hook.
 * @returns DayPilot-compatible onBeforeEventRender handler.
 */
export function createBeforeEventRender(opts?: BeforeEventRenderOptions) {
    const getTypeLabel = opts?.getTypeLabel;
    const getClientLabelSync = opts?.getClientLabelSync;
    const primeClient = opts?.primeClient;

    return function onBeforeEventRender(args: BeforeEventRenderArgs): void {
        try {
            const eventLike = args?.e;
            const data = args?.data ?? eventLike?.data ?? eventLike;
            if (!data) return;

            // Accept either `type` or `kind` markers; default to "reservation".
            const kind: "reservation" | "blockedTime" =
                (data.kind as any) ??
                (data.type as any) ??
                "reservation";

            const start = dpOrIso(eventLike, data, "start");
            const end = dpOrIso(eventLike, data, "end");
            const timeLine = `${fmtTime(start)}–${fmtTime(end)}`;

            if (kind === "reservation") {
                const res = data.reservation ?? {};
                const status = (res.status as any) ?? "Booked";

                const clientId: string | undefined = res.clientId;
                let clientLabel: string =
                    (res.clientName as string) ||
                    (data.clientName as string) ||
                    (clientId ? getClientLabelSync?.(clientId) : undefined) ||
                    clientId ||
                    "";

                const typeId =
                    typeof res.appointmentTypeId === "number" ? res.appointmentTypeId : undefined;
                const typeLabel =
                    (res.appointmentTypeName as string) ||
                    (typeId != null ? getTypeLabel?.(typeId) : undefined) ||
                    (typeId != null ? `Type ${typeId}` : "");

                // Compose CSS classes; keep existing classes intact.
                const statusClass = classForReservationStatus(status);
                data.cssClass = ["ev-reservation", data.cssClass, statusClass]
                    .filter(Boolean)
                    .join(" ");

                // Keep tooltip and structured content; avoid inline colors.
                data.toolTip = tooltipForReservation(status);
                data.html = threeLines(clientLabel, typeLabel, timeLine);

                // If the client label still looks like a GUID, try to prime it and refresh once.
                if (clientId && isGuid(clientLabel) && typeof primeClient === "function") {
                    const promiseLike = primeClient(clientId);
                    if (promiseLike && typeof (promiseLike as any).then === "function") {
                        (promiseLike as Promise<unknown>)
                            .then(() => {
                                const control = (args as any)?.control;
                                if (control && typeof control.update === "function") {
                                    // Defer to avoid synchronous re-entrancy during render.
                                    setTimeout(() => {
                                        try {
                                            control.update();
                                        } catch {
                                            /* no-op */
                                        }
                                    }, 0);
                                }
                            })
                            .catch(() => {
                                /* no-op */
                            });
                    }
                }
            } else {
                // Blocked time presentation
                const reason: string = data.reason || data.text || "Blocked";
                data.cssClass = ["ev-blocked", data.cssClass].filter(Boolean).join(" ");
                data.toolTip = "Blocked time";
                data.html = threeLines(reason, "Blocked time", timeLine, true);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("beforeEventRender:", error);
        }
    };
}

/**
 * Returns DayPilot date objects via getter if present, otherwise ISO string fields.
 */
function dpOrIso(eventLike: any, data: any, key: "start" | "end"): any {
    try {
        const value = eventLike && typeof eventLike[key] === "function" ? eventLike[key]() : undefined;
        if (value) return value;
    } catch {
        // ignore
    }
    return data?.[key];
}

/**
 * Formats a DayPilot date or ISO string to "h:mm tt".
 */
function fmtTime(value: any): string {
    try {
        if (value && typeof value.toString === "function") {
            // DayPilot.Date supports .toString("h:mm tt")
            return value.toString("h:mm tt");
        }
        if (typeof value === "string") {
            const match = value.match(/T(\d{2}:\d{2})/);
            if (match) return toAmPm(match[1]);
        }
    } catch {
        // ignore
    }
    return "";
}

/**
 * Converts "HH:MM" to "h:mm AM/PM".
 */
function toAmPm(hhmm: string): string {
    const [hoursStr, minutesStr] = hhmm.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = ((hours + 11) % 12) + 1;
    return `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/**
 * Builds the standard 3-line HTML block used by event bodies.
 */
function threeLines(
    primary: string,
    secondary: string,
    tertiary: string,
    italicSecondary = false
): string {
    const line2 = italicSecondary
        ? `<em class="bs-line2">${esc(secondary)}</em>`
        : `<span class="bs-line2">${esc(secondary)}</span>`;
    return `
<div class="bs-event">
  <div class="bs-line1">${esc(primary)}</div>
  ${line2}
  <div class="bs-line3">${esc(tertiary)}</div>
</div>`;
}

/**
 * Basic GUID shape check (v1–v5).
 */
function isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Escapes minimal HTML entities for safe injection into `data.html`.
 */
function esc(value?: string): string {
    if (!value) return "";
    return value.replace(/[&<>"']/g, (ch) =>
        ch === "&"
            ? "&amp;"
            : ch === "<"
                ? "&lt;"
                : ch === ">"
                    ? "&gt;"
                    : ch === '"'
                        ? "&quot;"
                        : "&#039;"
    );
}
