/**
 * @file Creates a DayPilot `onBeforeEventRender` handler dedicated to shaping
 *       reservation and blocked-time visual presentation (CSS class, tooltip, HTML).
 *       By default it avoids inline color props so CSS themes/overrides control visuals.
 */

import {
    classForReservationStatus,
    colorForReservationStatus,
    tooltipForReservation,
} from "@/domain/calendar/eventStyle";

type BeforeEventRenderArgs = {
    e?: any;
    data?: any;
    control?: { update?: () => void } | any;
};

export type BeforeEventRenderOptions = {
    getTypeLabel?: (id?: number) => string | undefined;
    getClientLabelSync?: (id?: string) => string | undefined;
    primeClient?: (id: string) => Promise<unknown> | void;
    /** If true, also set inline DayPilot colors so visuals match without relying on CSS. */
    useInlineColors?: boolean;
};

export function createBeforeEventRender(opts?: BeforeEventRenderOptions) {
    const getTypeLabel = opts?.getTypeLabel;
    const getClientLabelSync = opts?.getClientLabelSync;
    const primeClient = opts?.primeClient;
    const useInlineColors = !!opts?.useInlineColors;

    return function onBeforeEventRender(args: BeforeEventRenderArgs): void {
        try {
            const eventLike = args?.e;
            const data = args?.data ?? eventLike?.data ?? eventLike;
            if (!data) return;

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

                const statusClass = classForReservationStatus(status);
                data.cssClass = ["ev-reservation", data.cssClass, statusClass].filter(Boolean).join(" ");
                data.toolTip = tooltipForReservation(status);
                data.html = threeLines(clientLabel, typeLabel, timeLine);

                if (useInlineColors) {
                    const hex = colorForReservationStatus(status);
                    // Backdrop + left bar (DayPilot)
                    (data as any).backColor = hex;
                    (data as any).barColor = hex;
                }

                if (clientId && isGuid(clientLabel) && typeof primeClient === "function") {
                    const promiseLike = primeClient(clientId);
                    if (promiseLike && typeof (promiseLike as any).then === "function") {
                        (promiseLike as Promise<unknown>)
                            .then(() => {
                                const control = (args as any)?.control;
                                if (control && typeof control.update === "function") {
                                    setTimeout(() => {
                                        try {
                                            control.update();
                                        } catch {
                                            /* no-op */
                                        }
                                    }, 0);
                                }
                            })
                            .catch(() => {/* no-op */ });
                    }
                }
            } else {
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

function dpOrIso(eventLike: any, data: any, key: "start" | "end"): any {
    try {
        const value = eventLike && typeof eventLike[key] === "function" ? eventLike[key]() : undefined;
        if (value) return value;
    } catch { }
    return data?.[key];
}

function fmtTime(value: any): string {
    try {
        if (value && typeof value.toString === "function") {
            return value.toString("h:mm tt");
        }
        if (typeof value === "string") {
            const match = value.match(/T(\d{2}:\d{2})/);
            if (match) return toAmPm(match[1]);
        }
    } catch { }
    return "";
}

function toAmPm(hhmm: string): string {
    const [hoursStr, minutesStr] = hhmm.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = ((hours + 11) % 12) + 1;
    return `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

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

function isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function esc(value?: string): string {
    if (!value) return "";
    return value.replace(/[&<>"']/g, (ch) =>
        ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : "&#039;"
    );
}
