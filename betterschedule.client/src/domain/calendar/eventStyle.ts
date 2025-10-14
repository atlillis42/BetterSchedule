import type { ReservationDto } from "@/api/reservation-api";

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
 * Colors align with Tailwind palette accents used elsewhere:
 * - Booked:   #3b82f6 (blue-500)
 * - Completed:#10b981 (emerald-500)
 * - Canceled: #f59e0b (amber-500)   
 * - NoShow:   #ef4444 (red-500)     
 */
export function colorForReservationStatus(status: ReservationDto["status"]): string {
    switch (status) {
        case "Completed":
            return "#10b981";
        case "Canceled":
            return "#f59e0b"; // amber 
        case "NoShow":
            return "#ef4444"; // red 
        case "Booked":
        default:
            return "#3b82f6";
    }
}

export function tooltipForReservation(status: ReservationDto["status"]): string {
    const label = status === "NoShow" ? "No-Show / Late Cancel" : status;
    return `Reservation • ${label}`;
}
