import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import ReservationModal from "./ReservationModal";
import GroupReservationModal from "./GroupReservationModal";
import BlockedTimeModal from "./BlockedTimeModal";
import ConflictPill from "./ConflictPill";

type ProviderLite = { id: string; name: string };
type CalendarResource = { id: number; name: string };

type EventModalProps = {
    open: boolean;
    mode: "create" | "edit";
    type: "reservation" | "blockedTime";
    setType: (t: "reservation" | "blockedTime") => void;
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    onSubmit?: () => void;
    onDelete?: () => void;
    onCancel: () => void;
    error: string | null;
    resources: CalendarResource[];
    providers: ProviderLite[];
    onRefreshRequested?: () => void;
};

/** Internal reservation tab state (group is hidden for now). */
type ReservationTab = "details" | "group";

function quickStatusReservationId(values: any): number | undefined {
    if (typeof values?.reservation?.id === "number") return values.reservation.id;
    const raw = values?.id;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
        const m = raw.match(/(\d+)$/);
        if (m) return Number(m[1]);
    }
    return undefined;
}

const SegButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    title?: string;
}> = ({ active, onClick, children, disabled, title }) => (
    <button
        type="button"
        className={[
            "px-3 py-1 rounded-lg border text-sm transition-colors",
            active
                ? "bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700",
            disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        onClick={onClick}
        disabled={disabled}
        title={title}
    >
        {children}
    </button>
);

/**
 * EventModal: Hosts Reservation & Blocked Time forms.
 * - Edit mode shows ONLY the current type.
 * - Create mode allows toggling between Reservation and Blocked Time.
 * - Group Reservation tab is hidden for now.
 */
const EventModal: React.FC<EventModalProps> = ({
    open,
    mode,
    type,
    setType,
    values,
    setValues,
    onSubmit,
    onDelete,
    onCancel,
    error,
    resources,
    providers,
    onRefreshRequested,
}) => {
    const { isManager, isProvider } = useAuth();
    const isClientOnly = !isManager && !isProvider;

    // Keep details tab selected (group hidden for now)
    const [resTab, setResTab] = useState<ReservationTab>("details");

    // If group were enabled, this would track unsaved participants
    const pending = Array.isArray(values?.pendingParticipants) ? values.pendingParticipants : [];
    const hasUnsavedGroupChanges = false; // group tab is hidden; no prompt needed

    const handleCancel = () => {
        if (hasUnsavedGroupChanges) {
            const leave = window.confirm("You have unsaved changes. Leave without saving?");
            if (!leave) return;
        }
        onCancel();
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                handleCancel();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const reservationId = quickStatusReservationId(values);
    if (!open) return null;

    const isBlockedTimeConflict =
        type === "blockedTime" && typeof error === "string" && /(overlap|conflict)/i.test(error || "");

    // ---- Header button visibility rules ----
    const showReservationTabButton = mode === "create" || type === "reservation";
    const showBlockedTimeTabButton = !isClientOnly && (mode === "create" || type === "blockedTime");
    const showGroupTabButton = false; // hidden for now

    const showFooterSave = !isClientOnly && !!onSubmit;
    const showFooterDelete = !isClientOnly && !!onDelete;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={handleCancel}
        >
            <div
                className="
          w-full max-w-3xl rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-xl
          dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bs-modal
        "
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        {showReservationTabButton && (
                            <SegButton
                                active={type === "reservation"}
                                onClick={() => {
                                    setType("reservation");
                                    setResTab("details");
                                }}
                            >
                                Reservation
                            </SegButton>
                        )}

                        {/* Group tab intentionally hidden for now */}
                        {showGroupTabButton && (
                            <SegButton
                                active={type === "reservation" && resTab === "group"}
                                onClick={() => {
                                    setType("reservation");
                                    setResTab("group");
                                }}
                                disabled={type !== "reservation"}
                                title={type !== "reservation" ? "Switch to Reservation to manage participants" : undefined}
                            >
                                Group Reservation
                            </SegButton>
                        )}

                        {showBlockedTimeTabButton && (
                            <SegButton
                                active={type === "blockedTime"}
                                onClick={() => setType("blockedTime")}
                            >
                                Blocked Time
                            </SegButton>
                        )}
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        {isBlockedTimeConflict && <ConflictPill message={error} />}
                        <div className="text-sm text-slate-600 dark:text-slate-300">{mode === "edit" ? "Edit" : "Create"}</div>

                        {/* Close */}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
                            aria-label="Close"
                            title="Close"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden>
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    {type === "reservation" && (
                        <ReservationModal
                            mode={mode}
                            values={values}
                            setValues={setValues}
                            resources={resources}
                            providers={providers}
                            onRefreshRequested={onRefreshRequested}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Group modal intentionally removed for now */}
                    {/* {type === "reservation" && resTab === "group" && (
                        <GroupReservationModal ... />
                    )} */}

                    {type === "blockedTime" && (
                        <BlockedTimeModal values={values} setValues={setValues} resources={resources} />
                    )}

                    {error && !isBlockedTimeConflict && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3 border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {type === "reservation" ? "Reservation" : "Blocked time"}
                    </div>
                    <div className="flex items-center gap-2">
                        {showFooterDelete && (
                            <button
                                className="px-3 py-2 rounded-lg border text-red-700 border-red-200 hover:bg-red-50 dark:text-rose-300 dark:border-rose-900 dark:hover:bg-rose-900/30"
                                onClick={onDelete}
                            >
                                Delete
                            </button>
                        )}
                        {showFooterSave && (
                            <button
                                className="px-3 py-2 rounded-lg border bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                onClick={onSubmit}
                            >
                                Save
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventModal;
