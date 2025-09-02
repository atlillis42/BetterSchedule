import type { ReservationDto } from "@/api/reservation-api";

/**
 * Maps reservation status to a stable CSS class.
 */
export function classForReservationStatus(status: ReservationDto["status"]): string {
    switch (status) {
        case "Completed": return "res-status-completed";
        case "Canceled": return "res-status-canceled";
        case "NoShow": return "res-status-noshow";
        case "Booked":
        default: return "res-status-booked";
    }
}

/**
 * Maps reservation status to a default hex color.
 * @remarks Consumers may override these defaults in UI adapters.
 */
export function colorForReservationStatus(status: ReservationDto["status"]): string {
    switch (status) {
        case "Completed": return "#10b981"; // emerald
        case "Canceled": return "#9ca3af"; // gray
        case "NoShow": return "#f59e0b"; // amber
        case "Booked":
        default: return "#3b82f6"; // blue
    }
}

/**
 * Returns a compact tooltip for a reservation.
 */
export function tooltipForReservation(status: ReservationDto["status"]): string {
    return `Reservation • ${status}`;
}
