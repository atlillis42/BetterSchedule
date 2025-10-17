import { useEffect, useState } from "react";
import {
    createResource,
    updateResource,
    type CreateCalendarResourceDto,
    type UpdateCalendarResourceDto,
} from "@/api/calendar-resource-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";

/**
 * @file ResourcesModal.tsx
 * @summary Modal dialog to create or edit a calendar resource.
 * @remarks
 * - Only the resource name is edited/created (no color).
 * - Shows a single success toast (manager does not toast on save).
 * - Clean, consistent styling with other manager modals.
 */

/** Props for ResourcesModal. */
export interface ResourcesModalProps {
    /** Whether the modal is open. */
    open: boolean;
    /** Create or edit mode. */
    mode: "create" | "edit";
    /** Initial resource for edit mode. */
    initial?: CalendarResource | undefined;
    /** Close handler (Cancel/Close). */
    onClose: () => void;
    /** Called after successful save so the parent can refresh. */
    onSaved: () => void | Promise<void>;
}

/**
 * Resources create/edit modal.
 * @param props Component props.
 * @returns JSX element for the modal.
 */
export default function ResourcesModal(props: ResourcesModalProps) {
    const { open, mode, initial, onClose, onSaved } = props;

    const [name, setName] = useState<string>("");

    // hydrate on open
    useEffect(() => {
        if (!open) return;
        if (mode === "edit" && initial) {
            setName(initial.name ?? "");
        } else {
            setName("");
        }
    }, [open, mode, initial]);

    /** Basic validation returning user-facing errors. */
    function validate(): string[] {
        const errs: string[] = [];
        if (!name.trim()) errs.push("Name is required.");
        return errs;
    }

    /** Save handler (create or update). */
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
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {mode === "edit" ? "Edit Resource" : "Create Resource"}
                    </h2>
                    <button
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Name */}
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Name</span>
                        <input
                            className="rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                            placeholder="e.g., Room A, Treatment Table 1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <span className="mt-1 text-xs text-gray-500">Unique within your organization.</span>
                    </label>

                    {/* Future: blocked-time controls can live here */}
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2">
                    <button
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
