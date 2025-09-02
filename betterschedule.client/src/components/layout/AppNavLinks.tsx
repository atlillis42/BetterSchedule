/**
 * Summary: Primary app navigation links.
 * - Shows/hides admin/provider sections based on role flags.
 * - Pure presentational; no side-effects.
 */
import React from "react";
import { NavLink } from "react-router-dom";

type AppNavLinksProps = {
    canSeeProviderAvailability: boolean;
    canManage: boolean;
    isProvider: boolean;
};

const AppNavLinks: React.FC<AppNavLinksProps> = ({ canSeeProviderAvailability, canManage, isProvider }) => {
    // Managers go to admin page; Providers to self page
    const availabilityPath = canManage ? "/admin/provider-availability" : isProvider ? "/provider/availability" : null;

    return (
        <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/calendar" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                Calendar
            </NavLink>

            {canSeeProviderAvailability && availabilityPath && (
                <NavLink
                    to={availabilityPath}
                    className={({ isActive }) => (isActive ? "font-semibold" : "")}
                    title="Manage or view provider working hours"
                >
                    Provider Availability
                </NavLink>
            )}

            {canManage && (
                <>
                    <NavLink to="/admin/appointment-types" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Appointment Types
                    </NavLink>

                    <NavLink to="/admin/packages" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Packages
                    </NavLink>

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
