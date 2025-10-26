import { useEffect, useState } from "react";
import {
    createResource,
    updateResource,
    type CreateCalendarResourceDto,
    type UpdateCalendarResourceDto,
} from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";

export interface ResourcesModalProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: CalendarResource | undefined;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export default function ResourcesModal(props: ResourcesModalProps) {
    const { open, mode, initial, onClose, onSaved } = props;

    const [name, setName] = useState<string>("");

    useEffect(() => {
        if (!open) return;
        if (mode === "edit" && initial) {
            setName(initial.name ?? "");
        } else {
            setName("");
        }
    }, [open, mode, initial]);

    function validate(): string[] {
        const errs: string[] = [];
        if (!name.trim()) errs.push("Name is required.");
        return errs;
    }

    async function handleSave() {
        const errors = validate();
        if (errors.length) {
            errors.forEach((e) => toast.error(e));
            return;
        }

        try {
            if (mode === "edit" && initial) {
                const patch: UpdateCalendarResourceDto = { name: name.trim() };
                await updateResource(initial.id, patch);
                toast.success("Resource updated.");
            } else {
                const create: CreateCalendarResourceDto = { name: name.trim() };
                await createResource(create);
                toast.success("Resource created.");
            }
            await onSaved();
        } catch {
            toast.error("Failed to save resource.");
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={mode === "edit" ? "Edit Resource" : "Create Resource"}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="bs-modal relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {mode === "edit" ? "Edit Resource" : "Create Resource"}
                    </h2>
                    <button
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 gap-4">
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium">Name</span>
                        <input
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                            placeholder="e.g., Room A, Treatment Table 1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unique within your organization.</span>
                    </label>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2">
                    <button
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
