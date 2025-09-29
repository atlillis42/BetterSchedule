import React, { useEffect, useState } from "react";
import ReservationModal from "./ReservationModal";
import GroupReservationModal from "./GroupReservationModal";
import BlockedTimeModal from "./BlockedTimeModal";

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

type ReservationTab = "details" | "group";

/** Extracts a robust numeric id for quick-status and participant ops. */
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
        className={`px-3 py-1 rounded-lg border text-sm ${active ? "bg-gray-100" : ""
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={onClick}
        disabled={disabled}
        title={title}
    >
        {children}
    </button>
);

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
    const [resTab, setResTab] = useState<ReservationTab>("details");

    // Create-mode unsaved protection when on "Group" tab
    const pending = Array.isArray(values?.pendingParticipants) ? values.pendingParticipants : [];
    const hasUnsavedGroupChanges =
        open && type === "reservation" && mode === "create" && resTab === "group" && pending.length > 0;

    const handleCancel = () => {
        if (hasUnsavedGroupChanges) {
            const leave = window.confirm("You have unsaved changes. Leave without saving?");
            if (!leave) return;
        }
        onCancel();
    };

    // Esc to close
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
    }, [open, hasUnsavedGroupChanges, resTab, type]);

    const reservationId = quickStatusReservationId(values);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            role="dialog"
            aria-modal="true"
            onClick={handleCancel} // backdrop click closes
        >
            <div
                className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()} // prevent backdrop close when clicking content
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <SegButton
                            active={type === "reservation" && resTab === "details"}
                            onClick={() => {
                                setType("reservation");
                                setResTab("details");
                            }}
                        >
                            Reservation
                        </SegButton>

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

                        <SegButton active={type === "blockedTime"} onClick={() => setType("blockedTime")}>
                            Blocked Time
                        </SegButton>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">{mode === "edit" ? "Edit" : "Create"}</div>

                        {/* Close icon (top-right) */}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            aria-label="Close"
                            title="Close"
                        >
                            {/* simple X icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-5 w-5 text-gray-600"
                                aria-hidden="true"
                            >
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
                    {type === "reservation" && resTab === "details" && (
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

                    {type === "reservation" && resTab === "group" && (
                        <GroupReservationModal
                            mode={mode}
                            values={values}
                            setValues={setValues}
                            providers={providers}
                            reservationId={reservationId}
                        />
                    )}

                    {type === "blockedTime" && <BlockedTimeModal values={values} setValues={setValues} resources={resources} />}

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <div className="text-xs text-gray-500">
                        {type === "reservation" ? (resTab === "group" ? "Group Reservation" : "Reservation") : "Blocked time"}
                    </div>
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button className="px-3 py-2 rounded-lg border text-red-700" onClick={onDelete}>
                                Delete
                            </button>
                        )}
                        {onSubmit && (
                            <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={onSubmit}>
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
