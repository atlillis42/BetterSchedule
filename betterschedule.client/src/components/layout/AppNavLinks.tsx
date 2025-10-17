/**
 * Summary: Primary app navigation links for BetterSchedule (demo-ready).
 * - Hides unfinished areas in the demo (e.g., Packages).
 * - Shows admin sections based on `canManage`.
 * - Pure presentational; no side effects.
 */

import React from "react";
import { NavLink } from "react-router-dom";

/** Props for AppNavLinks. */
export type AppNavLinksProps = {
    /** Whether the user has admin/manager permissions. */
    canManage: boolean;
};

/** Renders top-level navigation links. */
const AppNavLinks: React.FC<AppNavLinksProps> = ({ canManage }) => {
    return (
        <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/calendar" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                Calendar
            </NavLink>

            {canManage && (
                <>
                    <NavLink
                        to="/manager/appointment-types"
                        className={({ isActive }) => (isActive ? "font-semibold" : "")}
                    >
                        Appointment Types
                    </NavLink>

                    {/* Packages: intentionally hidden for demo */}

                    <NavLink to="/manager/resources" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Resources
                    </NavLink>

                    <NavLink to="/manager/users" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Users
                    </NavLink>

                    <NavLink to="/manager/settings" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                        Settings
                    </NavLink>
                </>
            )}
        </nav>
    );
};

export default AppNavLinks;
