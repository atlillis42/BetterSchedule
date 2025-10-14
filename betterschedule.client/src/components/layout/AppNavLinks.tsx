/**
 * Summary: Primary app navigation links for BetterSchedule (demo-ready).
 * - Hides unfinished areas in the demo: Provider Availability and Packages.
 * - Shows admin sections (except Packages) based on `canManage`.
 * - Pure presentational; no side effects.
 */

import React from "react";
import { NavLink } from "react-router-dom";

/**
 * Props for AppNavLinks.
 * @remarks
 * For the demo:
 * - Provider Availability is intentionally NOT shown, even if the user can manage or is a provider.
 * - Packages is intentionally NOT shown, even if the user can manage.
 */
export type AppNavLinksProps = {
    /** Whether the user could see provider availability in non-demo builds. */
    canSeeProviderAvailability: boolean;
    /** Whether the user has admin/manager permissions. */
    canManage: boolean;
    /** Whether the user is a provider. */
    isProvider: boolean;
};

/**
 * Renders top-level navigation links.
 * Demo build intentionally omits Provider Availability and Packages links.
 */
const AppNavLinks: React.FC<AppNavLinksProps> = ({ canManage }) => {
    return (
        <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/calendar" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                Calendar
            </NavLink>

            {/* Provider Availability: intentionally hidden for demo */}

            {canManage && (
                <>
                    <NavLink
                        to="/admin/appointment-types"
                        className={({ isActive }) => (isActive ? "font-semibold" : "")}
                    >
                        Appointment Types
                    </NavLink>

                    {/* Packages: intentionally hidden for demo */}

                    <NavLink to="/admin/resources" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Resources
                    </NavLink>

                    <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Users
                    </NavLink>

                    <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Settings
                    </NavLink>
                </>
            )}
        </nav>
    );
};

export default AppNavLinks;
