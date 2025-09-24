import {
    classForReservationStatus,
    colorForReservationStatus,
    tooltipForReservation,
} from "@/domain/calendar/eventStyle";

/**
 * Creates a DayPilot `onBeforeEventRender` handler that formats reservation and block entries.
 * Label resolution is synchronous; callers inject lookup functions for client and appointment type names.
 */
export function createBeforeEventRender(opts?: {
    /** Returns a display label for an appointment type id. */
    getTypeLabel?: (id?: number) => string | undefined;
    /** Returns a cached client display name, if available. */
    getClientLabelSync?: (id?: string) => string | undefined;
    /** Optionally primes a client name lookup and schedules a safe re-render. */
    primeClient?: (id: string) => Promise<unknown> | void;
}) {
    const getTypeLabel = opts?.getTypeLabel;
    const getClientLabelSync = opts?.getClientLabelSync;
    const primeClient = opts?.primeClient;

    return function onBeforeEventRender(args: any) {
        try {
            const e = args?.e;
            const data = args?.data ?? e?.data ?? e;
            if (!data) return;

            const kind: "reservation" | "blockedTime" = (data.type as any) ?? "reservation";
            const start = dpOrIso(e, data, "start");
            const end = dpOrIso(e, data, "end");
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

                const typeId = typeof res.appointmentTypeId === "number" ? res.appointmentTypeId : undefined;
                const typeLabel =
                    (res.appointmentTypeName as string) ||
                    (typeId != null ? getTypeLabel?.(typeId) : undefined) ||
                    (typeId != null ? `Type ${typeId}` : "");

                data.cssClass = [data.cssClass, classForReservationStatus(status)].filter(Boolean).join(" ");
                if (!data.backColor) data.backColor = colorForReservationStatus(status);
                data.toolTip = tooltipForReservation(status);
                data.html = threeLines(clientLabel, typeLabel, timeLine);

                if (clientId && isGuid(clientLabel) && typeof primeClient === "function") {
                    const p = primeClient(clientId);
                    if (p && typeof (p as any).then === "function") {
                        (p as Promise<unknown>)
                            .then(() => {
                                const control = args?.control;
                                if (control && typeof control.update === "function") {
                                    setTimeout(() => {
                                        try { control.update(); } catch { }
                                    }, 0);
                                }
                            })
                            .catch(() => { });
                    }
                }
            } else {
                const reason: string = data.reason || data.text || "Blocked";
                if (!data.backColor) data.backColor = "#9ca3af";
                data.toolTip = "Blocked time";
                data.html = threeLines(reason, "Blocked time", timeLine, true);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("beforeEventRender:", err);
        }
    };
}

/** Returns a DayPilot date when present on the event instance, otherwise an ISO string from data. */
function dpOrIso(e: any, data: any, key: "start" | "end"): any {
    try { const v = e && typeof e[key] === "function" ? e[key]() : undefined; if (v) return v; } catch { }
    return data?.[key];
}

/** Formats a DayPilot date or ISO string to a compact time. */
function fmtTime(v: any): string {
    try {
        if (v && typeof v.toString === "function") return v.toString("h:mm tt");
        if (typeof v === "string") {
            const m = v.match(/T(\d{2}:\d{2})/); if (m) return toAmPm(m[1]);
        }
    } catch { }
    return "";
}

/** Converts "HH:mm" to "h:mm AM/PM". */
function toAmPm(hhmm: string): string {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = ((h + 11) % 12) + 1;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Renders a compact three-line HTML block for event content. */
function threeLines(primary: string, secondary: string, tertiary: string, italicSecondary = false): string {
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

/** Best-effort GUID check used to detect unresolved client labels. */
function isGuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Escapes HTML-sensitive characters. */
function esc(s?: string): string {
    if (!s) return "";
    return s.replace(/[&<>"']/g, ch =>
        ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : "&#039;");
}
