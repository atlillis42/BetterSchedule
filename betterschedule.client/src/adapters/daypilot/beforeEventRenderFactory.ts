import type { ReservationDto } from "@/api/reservation-api";
import { classForReservationStatus, colorForReservationStatus, tooltipForReservation } from "@/domain/calendar/eventStyle";

/**
 * Produces a DayPilot `onBeforeEventRender` handler for consistent
 * reservation coloring, classes, and tooltips.
 */
export function createBeforeEventRender(
    opts?: {
        reservationStatusColors?: Partial<Record<ReservationDto["status"], string>>;
        reservationBaseClass?: string;
    }
) {
    const { reservationStatusColors, reservationBaseClass } = opts ?? {};

    return (args: any) => {
        const e = args?.data ?? args?.e?.data ?? args?.e;
        if (!e) return;

        const type = e.type ?? "reservation";
        if (type !== "reservation" || !e.reservation) return;

        const status: ReservationDto["status"] = e.reservation.status;

        const colorOverride = reservationStatusColors?.[status];
        const backColor = colorOverride ?? colorForReservationStatus(status);
        const cssClass = [reservationBaseClass, classForReservationStatus(status)]
            .filter(Boolean)
            .join(" ");

        args.data.backColor = backColor;
        args.data.cssClass = [args.data.cssClass, cssClass].filter(Boolean).join(" ");
        args.data.toolTip = tooltipForReservation(status);
    };
}
