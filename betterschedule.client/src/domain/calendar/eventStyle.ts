import type { ReservationDto } from "@/api/reservation-api";

/**
 * Returns a stable CSS class for the reservation status.
 * Used by theme CSS to derive consistent color/tint styling.
 */
export function classForReservationStatus(status: ReservationDto["status"]): string {
    switch (status) {
        case "Completed":
            return "res-status-completed";
        case "Canceled":
            return "res-status-canceled";
        case "NoShow":
            return "res-status-noshow";
        case "Booked":
        default:
            return "res-status-booked";
    }
}

/**
 * Maps reservation status to the default accent color (hex).
 * @remarks
 * UI adapters (e.g., DayPilot beforeEventRender) may override these.
 * Colors align with Tailwind palette accents used elsewhere:
 * - Booked:  #3b82f6 (blue-500)
 * - Completed:#10b981 (emerald-500)
 * - NoShow:  #f59e0b (amber-500)
 * - Canceled:#ef4444 (red-500) 
 */
export function colorForReservationStatus(status: ReservationDto["status"]): string {
    switch (status) {
        case "Completed":
            return "#10b981"; // emerald
        case "Canceled":
            return "#ef4444"; // red (updated)
        case "NoShow":
            return "#f59e0b"; // amber
        case "Booked":
        default:
            return "#3b82f6"; // blue
    }
}

/**
 * Returns a compact tooltip for the reservation.
 */
export function tooltipForReservation(status: ReservationDto["status"]): string {
    return `Reservation • ${status}`;
}
