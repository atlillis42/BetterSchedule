/**
 * @file Top navigation bar for BetterSchedule (responsive-ready, no demo switcher).
 * @summary
 * - Desktop (>= lg): brand + inline primary navigation; no view menu here (toolbar shows it).
 * - Mobile/Tablet (< lg): a single "Calendar" button opens a bottom sheet that contains:
 *     - Pages (AppNavLinks equivalent)
 *     - Change View (Day/Resources/Week/Month)
 *     - Navigator open button
 */

import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-context";

/** Cross-component event names (align with CalendarToolbar/CalendarNavigatorPane) */
const VIEW_CHANGED_EVT = "bs:viewChanged";
const REQUEST_VIEW_CHANGE_EVT = "bs:requestViewChange";
const REQUEST_NAV_TOGGLE_EVT = "bs:requestNavToggle";

/** Types for calendar views */
type CalendarView = "Day" | "Resources" | "Week" | "Month";

export type TopNavProps = {
    /** Primary navigation links, rendered inline on desktop (component provided by caller). */
    NavLinks: React.ComponentType<{ canManage: boolean }>;
    /** Optional explicit logout override; otherwise uses AuthContext.logout(). */
    onLogout?: () => Promise<void>;
};

const TopNav: React.FC<TopNavProps> = ({ NavLinks, onLogout }) => {
    const navigate = useNavigate();
    const { user, isManager, logout: authLogout } = useAuth();

    /** Current view for highlighting in the mobile sheet */
    const [currentView, setCurrentView] = React.useState<CalendarView>("Week");

    /** Mobile sheet open state */
    const [sheetOpen, setSheetOpen] = React.useState(false);

    // Listen for view changes originating from CalendarToolbar
    React.useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as CalendarView | undefined;
            if (detail) setCurrentView(detail);
        };
        window.addEventListener(VIEW_CHANGED_EVT, handler as EventListener);
        return () => window.removeEventListener(VIEW_CHANGED_EVT, handler as EventListener);
    }, []);

    const handleLogout = async () => {
        if (onLogout) {
            await onLogout();
            return;
        }
        await authLogout();
    };

    return (
        <header
            className="bg-white text-slate-800 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex justify-between items-center border-b border-slate-200"
            role="banner"
        >
            {/* Left: Brand + desktop nav + mobile sheet trigger */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
                <button
                    type="button"
                    onClick={() => navigate("/calendar")}
                    className="text-lg sm:text-xl font-bold text-blue-600 hover:text-blue-700 focus:outline-none"
                    aria-label="Go to calendar"
                    title="BetterSchedule"
                >
                    BetterSchedule
                </button>

                {/* Desktop nav (>= lg) */}
                <div className="hidden lg:block">
                    <NavLinks canManage={isManager} />
                </div>

                {/* Mobile/Tablet (< lg): one button to open the sheet */}
                <div className="lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-3 h-9 rounded-md border border-slate-200 hover:bg-slate-50 text-sm"
                        title="Open calendar menu"
                        aria-label="Open calendar menu"
                    >
                        {/* Icon (shown always); label hidden on very tiny screens to save space */}
                        <CalendarIcon className="w-4 h-4" />
                        <span className="hidden xs:inline">Calendar</span>
                    </button>
                </div>
            </div>

            {/* Right: User summary + Logout (trimmed on small screens) */}
            <div className="flex items-center gap-2 sm:gap-3">
                {user && (
                    <span
                        className="hidden md:block text-sm text-slate-700 max-w-[28ch] truncate"
                        title={user}
                    >
                        Signed in as <span className="font-semibold">{user}</span>
                    </span>
                )}
                <button
                    onClick={handleLogout}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 transition text-sm"
                >
                    Logout
                </button>
            </div>

            {/* Mobile bottom sheet (Pages + Change View + Navigator) */}
            <MobileCalendarSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                isManager={isManager}
                currentView={currentView}
            />
        </header>
    );
};

export default TopNav;

/* --------------------------------------------------------------------------------
 * Mobile bottom sheet implementation (self-contained in this file for drop-in).
 * -------------------------------------------------------------------------------- */

function MobileCalendarSheet(props: {
    open: boolean;
    onClose: () => void;
    isManager: boolean;
    currentView: CalendarView;
}) {
    const { open, onClose, isManager, currentView } = props;

    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const changeView = (v: CalendarView) => {
        window.dispatchEvent(new CustomEvent(REQUEST_VIEW_CHANGE_EVT, { detail: v }));
        onClose();
    };

    const openNavigator = () => {
        window.dispatchEvent(new CustomEvent(REQUEST_NAV_TOGGLE_EVT));
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Bottom sheet */}
            <div
                className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-2xl border-t border-slate-200
                   p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-auto"
                role="dialog"
                aria-modal="true"
                aria-label="Calendar menu"
            >
                <div className="flex items-center justify-center mb-3">
                    <div className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden />
                </div>

                {/* Section: Change View */}
                <section className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Change View</div>
                    <div className="grid grid-cols-2 gap-2">
                        {(["Day", "Resources", "Week", "Month"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => changeView(v)}
                                className={`px-3 py-2 rounded-md border text-sm text-left
                  ${currentView === v
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white hover:bg-blue-50 border-slate-200"
                                    }`}
                                aria-current={currentView === v ? "page" : undefined}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section: Navigator */}
                <section className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Navigator</div>
                    <button
                        onClick={openNavigator}
                        className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-blue-50 text-left text-sm"
                    >
                        Open date navigator
                    </button>
                </section>

                {/* Section: Pages */}
                <section className="mb-2">
                    <div className="text-xs font-semibold text-slate-500 mb-2">Pages</div>
                    <nav className="flex flex-col text-sm">
                        <NavMenuItem to="/calendar" onClick={onClose} label="Calendar" />
                        {isManager && (
                            <>
                                <NavMenuItem to="/manager/appointment-types" onClick={onClose} label="Appointment Types" />
                                <NavMenuItem to="/manager/resources" onClick={onClose} label="Resources" />
                                <NavMenuItem to="/manager/users" onClick={onClose} label="Users" />
                                <NavMenuItem to="/manager/settings" onClick={onClose} label="Settings" />
                            </>
                        )}
                    </nav>
                </section>

                {/* Close button row (mobile affordance) */}
                <div className="mt-2 flex justify-end">
                    <button
                        className="text-sm px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
                        onClick={onClose}
                        aria-label="Close menu"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function NavMenuItem(props: { to: string; onClick: () => void; label: string }) {
    const { to, onClick, label } = props;
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"
                }`
            }
            onClick={onClick}
        >
            {label}
        </NavLink>
    );
}

function CalendarIcon(props: { className?: string }) {
    // Simple inline SVG to avoid extra deps; keeps icon crisp at all sizes
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={props.className}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
            <path d="M8 2.5v4M16 2.5v4M3 10h18" />
        </svg>
    );
}
