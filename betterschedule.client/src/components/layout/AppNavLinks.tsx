/**
 * Summary: Primary app navigation links for BetterSchedule (demo-ready).
 * - Hides unfinished areas in the demo (e.g., Packages).
 * - Shows admin sections based on `canManage`.
 * - Supports "inline" (default) and "menu" variants.
 */

import React from "react";
import { NavLink } from "react-router-dom";

/** Props for AppNavLinks. */
export type AppNavLinksProps = {
    /** Whether the user has admin/manager permissions. */
    canManage: boolean;
    /** Render style: horizontal inline (default) or vertical menu items for dropdowns. */
    variant?: "inline" | "menu";
};

/** Renders top-level navigation links. */
const AppNavLinks: React.FC<AppNavLinksProps> = ({ canManage, variant = "inline" }) => {
    const wrapClass =
        variant === "inline"
            ? "flex items-center gap-4 text-sm"
            : "flex flex-col py-2 text-sm";

    const linkClass = (isActive: boolean) =>
        variant === "inline"
            ? isActive
                ? "font-semibold"
                : "hover:text-slate-900 dark:hover:text-white"
            : `block px-3 py-2 rounded ${isActive
                ? "bg-blue-50 font-semibold dark:bg-slate-700"
                : "hover:bg-slate-50 dark:hover:bg-slate-700"
            }`;

    return (
        <nav className={wrapClass}>
            <NavLink to="/calendar" className={({ isActive }) => linkClass(isActive)}>
                Calendar
            </NavLink>

            {canManage && (
                <>
                    <NavLink
                        to="/manager/appointment-types"
                        className={({ isActive }) => linkClass(isActive)}
                    >
                        Appointment Types
                    </NavLink>

                    {/* Packages: intentionally hidden for demo */}

                    <NavLink to="/manager/resources" className={({ isActive }) => linkClass(isActive)}>
                        Resources
                    </NavLink>

                    <NavLink to="/manager/users" className={({ isActive }) => linkClass(isActive)}>
                        Users
                    </NavLink>

                    <NavLink to="/manager/settings" className={({ isActive }) => linkClass(isActive)}>
                        Settings
                    </NavLink>
                </>
            )}
        </nav>
    );
};

export default AppNavLinks;
