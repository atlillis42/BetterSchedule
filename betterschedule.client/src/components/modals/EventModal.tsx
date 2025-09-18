import React from "react";
import ReservationForm from "./ReservationForm";
import BlockedTimeForm from "./BlockedTimeForm";

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
    /** Optional: ask parent to refresh calendar after quick-status action */
    onRefreshRequested?: () => void;
};

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
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            className={`px-3 py-1 rounded-lg border text-sm ${type === "reservation" ? "bg-gray-100" : ""}`}
                            onClick={() => setType("reservation")}
                        >
                            Reservation
                        </button>
                        <button
                            className={`px-3 py-1 rounded-lg border text-sm ${type === "blockedTime" ? "bg-gray-100" : ""}`}
                            onClick={() => setType("blockedTime")}
                        >
                            Blocked Time
                        </button>
                    </div>
                    <div className="text-sm text-gray-500">{mode === "edit" ? "Edit" : "Create"}</div>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    {type === "reservation" ? (
                        <ReservationForm
                            mode={mode}
                            values={values}
                            setValues={setValues}
                            providers={providers}
                            resources={resources}
                            onRefreshRequested={onRefreshRequested}
                            onClose={onCancel}
                        />
                    ) : (
                        <BlockedTimeForm
                            mode={mode}
                            values={values}
                            setValues={setValues}
                            resources={resources}
                        />
                    )}

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <div className="text-xs text-gray-500">{type === "reservation" ? "Reservation" : "Blocked time"}</div>
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button className="px-3 py-2 rounded-lg border text-red-700" onClick={onDelete}>
                                Delete
                            </button>
                        )}
                        <button className="px-3 py-2 rounded-lg border" onClick={onCancel}>
                            Cancel
                        </button>
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
