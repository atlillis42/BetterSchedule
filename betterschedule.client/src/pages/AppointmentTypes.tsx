import AppointmentTypeManager from "@/components/manager/AppointmentType/AppointmentTypeManager";

/**
 * @file AppointmentTypes.tsx
 * @summary Page wrapper that renders the Appointment Type manager.
 * @remarks Mirrors the CalendarResources wrapper style for consistent routing.
 */

/**
 * Renders the Appointment Types management page.
 * @returns JSX element for the page wrapper.
 */
export default function AppointmentTypesPage() {
    return <AppointmentTypeManager />;
}
