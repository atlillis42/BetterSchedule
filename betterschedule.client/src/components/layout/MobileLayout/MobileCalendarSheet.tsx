import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

// Shared event names (same ones used in TopNav/Toolbar/Navigator)
const REQUEST_VIEW_CHANGE_EVT = "bs:requestViewChange";
const REQUEST_NAV_TOGGLE_EVT = "bs:requestNavToggle";

export type MobileCalendarSheetProps = {
    open: boolean;
    onClose: () => void;
    isManager: boolean;
    currentView: "Day" | "Resources" | "Week" | "Month";
};

const MobileCalendarSheet: React.FC<MobileCalendarSheetProps> = ({
    open,
    onClose,
    isManager,
    currentView,
}) => {
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const changeView = (v: "Day" | "Resources" | "Week" | "Month") => {
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
                <div className="flex items-center justify-between mb-3">
                    <div className="h-1.5 w-12 rounded-full bg-slate-200 mx-auto" aria-hidden />
                    <button
                        className="text-sm px-2 py-1 rounded hover:bg-slate-100"
                        onClick={onClose}
                        aria-label="Close menu"
                    >
                        Close
                    </button>
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
                        <NavLink
                            to="/calendar"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"}`
                            }
                            onClick={onClose}
                        >
                            Calendar
                        </NavLink>

                        {isManager && (
                            <>
                                <NavLink
                                    to="/manager/appointment-types"
                                    className={({ isActive }) =>
                                        `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"}`
                                    }
                                    onClick={onClose}
                                >
                                    Appointment Types
                                </NavLink>
                                <NavLink
                                    to="/manager/resources"
                                    className={({ isActive }) =>
                                        `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"}`
                                    }
                                    onClick={onClose}
                                >
                                    Resources
                                </NavLink>
                                <NavLink
                                    to="/manager/users"
                                    className={({ isActive }) =>
                                        `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"}`
                                    }
                                    onClick={onClose}
                                >
                                    Users
                                </NavLink>
                                <NavLink
                                    to="/manager/settings"
                                    className={({ isActive }) =>
                                        `px-3 py-2 rounded border ${isActive ? "bg-blue-50 border-blue-100 font-semibold" : "border-transparent hover:bg-slate-50"}`
                                    }
                                    onClick={onClose}
                                >
                                    Settings
                                </NavLink>
                            </>
                        )}
                    </nav>
                </section>
            </div>
        </div>
    );
};

export default MobileCalendarSheet;
