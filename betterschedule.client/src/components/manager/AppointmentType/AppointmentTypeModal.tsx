import { useEffect, useMemo, useState } from "react";
import {
    createAppointmentType,
    updateAppointmentType,
    type CreateAppointmentTypeDto,
    type UpdateAppointmentTypeDto,
    type AppointmentTypeDto,
} from "@/api/appointmenttype-api";
import type { CalendarResource } from "@/types/calendarDataTypes";
import { toast } from "react-toastify";

/**
 * @file AppointmentTypeModal.tsx
 * @summary Modal dialog to create or edit an Appointment Type.
 * @remarks
 * - 15-minute duration increments (15–240), plus optional custom HH:MM.
 * - Stores duration as HH:MM:SS; displays without seconds.
 * - Includes a disabled "Assigned Provider (optional)" field to prime UX for scoping.
 */

/** Props for AppointmentTypeModal. */
export interface AppointmentTypeModalProps {
    /** Whether the modal is open. */
    open: boolean;
    /** Create or edit mode. */
    mode: "create" | "edit";
    /** Initial appointment type data used only for edit mode. */
    initial?: AppointmentTypeDto | undefined;
    /** Available resources to assign. */
    resources: CalendarResource[];
    /** Close handler (called on Cancel/Close). */
    onClose: () => void;
    /** Callback invoked after a successful save; parent should refresh data. */
    onSaved: () => void | Promise<void>;
}

/** Converts minutes to "HH:MM:SS". */
function minutesToHms(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:00`;
}

/** Parses "HH:MM:SS" into total minutes (or null). */
function hmsToMinutes(hhmmss: string | undefined | null): number | null {
    if (!hhmmss) return null;
    const m = /^(\d{2}):([0-5]\d):([0-5]\d)$/.exec(hhmmss);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Formats "HH:MM:SS" for display without seconds. */
function formatDurationLabel(hhmmss: string | undefined | null): string {
    const mins = hmsToMinutes(hhmmss);
    if (mins == null) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
}

/** Validates HH:MM input for custom duration. */
function isValidHhMm(input: string): boolean {
    return /^(\d{1,2}):([0-5]\d)$/.test(input);
}

/**
 * Modal dialog for creating or editing an Appointment Type.
 * @param props Component props.
 * @returns JSX element for the modal.
 */
export default function AppointmentTypeModal(props: AppointmentTypeModalProps) {
    const { open, mode, initial, resources, onClose, onSaved } = props;

    // ----- Form state -----
    const [name, setName] = useState<string>("");
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState<string>("");
    const [isPublic, setIsPublic] = useState<boolean>(true);
    const [requiresWaiver, setRequiresWaiver] = useState<boolean>(false);
    const [assignedResourceId, setAssignedResourceId] = useState<number | undefined>(undefined);

    // Duration state: default to 60 minutes for create; keep initial on edit
    const [durationMinutes, setDurationMinutes] = useState<number>(60);
    const [useCustomDuration, setUseCustomDuration] = useState<boolean>(false);
    const [customHhMm, setCustomHhMm] = useState<string>("");

    // Edit-only: clear resource
    const [willUnassign, setWillUnassign] = useState<boolean>(false);

    // Preload initial data on open/edit
    useEffect(() => {
        if (!open) return;

        if (mode === "edit" && initial) {
            setName(initial.name ?? "");
            setPrice(initial.price ?? 0);
            setDescription(initial.description ?? "");
            setIsPublic(!!initial.isPublic);
            setRequiresWaiver(!!initial.requiresWaiver);
            setAssignedResourceId(initial.assignedResourceId ?? undefined);
            setWillUnassign(false);

            const mins = hmsToMinutes(initial.duration) ?? 60;
            setDurationMinutes(mins);
            setUseCustomDuration(mins % 15 !== 0);
            setCustomHhMm(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
        } else {
            // create defaults
            setName("");
            setPrice(0);
            setDescription("");
            setIsPublic(true);
            setRequiresWaiver(false);
            setAssignedResourceId(undefined);
            setWillUnassign(false);
            setDurationMinutes(60);
            setUseCustomDuration(false);
            setCustomHhMm("");
        }
    }, [open, mode, initial]);

    /** 15-minute options from 15 to 240 minutes. */
    const durationOptions = useMemo(() => {
        const mins: number[] = [];
        for (let m = 15; m <= 240; m += 15) mins.push(m);
        return mins.map((m) => ({
            label: m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`,
            value: m,
        }));
    }, []);

    /** Returns "HH:MM:SS" from current duration state. */
    const durationHms = useMemo(() => {
        if (useCustomDuration) {
            if (!isValidHhMm(customHhMm)) return null;
            const [hh, mm] = customHhMm.split(":").map((x) => parseInt(x, 10));
            const total = hh * 60 + mm;
            return minutesToHms(total);
        }
        return minutesToHms(durationMinutes);
    }, [useCustomDuration, customHhMm, durationMinutes]);

    /** Basic form validation returning user-facing errors. */
    function validate(): string[] {
        const errs: string[] = [];
        if (!name.trim()) errs.push("Name is required.");
        if (!durationHms) errs.push("Duration must be set (use a preset or enter HH:MM).");
        if (price < 0) errs.push("Price cannot be negative.");
        if (mode === "edit" && willUnassign && assignedResourceId != null) {
            errs.push("Choose either Unassign or a specific resource, not both.");
        }
        return errs;
    }

    /** Handles save for create/edit. Shows a single success toast here. */
    async function handleSave() {
        const errors = validate();
        if (errors.length) {
            errors.forEach((e) => toast.error(e));
            return;
        }

        try {
            if (mode === "edit" && initial) {
                const patch: UpdateAppointmentTypeDto = {
                    name: name.trim() || undefined,
                    duration: durationHms || undefined,
                    price: Number.isFinite(price) ? price : undefined,
                    description: description ?? undefined,
                    isPublic,
                    requiresWaiver,
                };

                if (willUnassign) {
                    (patch as UpdateAppointmentTypeDto).clearAssignedResource = true;
                } else if (assignedResourceId != null) {
                    (patch as UpdateAppointmentTypeDto).assignedResourceId = assignedResourceId;
                }
                await updateAppointmentType(initial.id, patch);
                toast.success("Appointment type updated.");
            } else {
                const create: CreateAppointmentTypeDto = {
                    name: name.trim(),
                    duration: durationHms ?? minutesToHms(60),
                    price: Number.isFinite(price) ? price : 0,
                    description: description ?? "",
                    isPublic,
                    requiresWaiver,
                    assignedResourceId: assignedResourceId ?? undefined,
                };
                await createAppointmentType(create);
                toast.success("Appointment type created.");
            }
            await onSaved();
        } catch {
            toast.error("Failed to save appointment type.");
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={mode === "edit" ? "Edit Appointment Type" : "Create Appointment Type"}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {mode === "edit" ? "Edit Appointment Type" : "Create Appointment Type"}
                    </h2>
                    <button
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Name */}
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Name</span>
                        <input
                            className="rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                            placeholder="e.g., 60-Minute Massage"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <span className="mt-1 text-xs text-gray-500">Unique within your organization.</span>
                    </label>

                    {/* Duration (15-min increments + optional custom) */}
                    <div className="grid grid-cols-1 gap-2">
                        <label className="flex flex-col text-sm">
                            <span className="mb-1 font-medium text-gray-700">Duration</span>
                            <div className="flex items-stretch gap-2">
                                <select
                                    className="w-40 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    value={useCustomDuration ? "__custom__" : String(durationMinutes)}
                                    onChange={(e) => {
                                        if (e.target.value === "__custom__") {
                                            setUseCustomDuration(true);
                                        } else {
                                            setUseCustomDuration(false);
                                            setDurationMinutes(parseInt(e.target.value, 10));
                                        }
                                    }}
                                >
                                    {durationOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                    <option value="__custom__">Other…</option>
                                </select>
                                <input
                                    className="w-28 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                                    placeholder="HH:MM"
                                    value={useCustomDuration ? customHhMm : (formatDurationLabel(minutesToHms(durationMinutes)) || "")}
                                    disabled={!useCustomDuration}
                                    onChange={(e) => setCustomHhMm(e.target.value)}
                                />
                            </div>
                            <span className="mt-1 text-xs text-gray-500">
                                Defaults to 15-minute increments. Custom accepts <code>HH:MM</code>. Stored as{" "}
                                <code>HH:MM:SS</code>.
                            </span>
                        </label>
                    </div>

                    {/* Price */}
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Price</span>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-32 rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                            value={Number.isFinite(price) ? price : 0}
                            onChange={(e) => setPrice(Number(e.target.value))}
                        />
                        <span className="mt-1 text-xs text-gray-500">
                            Displayed to clients (e.g., {Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number.isFinite(price) ? price : 0)}).
                        </span>
                    </label>

                    {/* Assigned Resource */}
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Assigned Resource (optional)</span>
                        <div className="flex items-center gap-2">
                            <select
                                className="flex-1 rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                                value={assignedResourceId ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    setAssignedResourceId(val);
                                    if (val !== undefined) setWillUnassign(false);
                                }}
                            >
                                <option value="">(None)</option>
                                {resources.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>

                            {mode === "edit" ? (
                                <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${willUnassign
                                            ? "border-amber-400 bg-amber-50 text-amber-700"
                                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                    title="Mark to unassign resource on save"
                                    onClick={() => {
                                        const next = !willUnassign;
                                        setWillUnassign(next);
                                        if (next) setAssignedResourceId(undefined);
                                    }}
                                >
                                    {willUnassign ? "Will Unassign" : "Unassign"}
                                </button>
                            ) : null}
                        </div>

                        <span className="mt-1 text-xs text-gray-500">
                            Assign location or equipment this service uses. Depending on your organization's rules, bookings can
                            reserve the resource and help prevent double-booking. 
                        </span>
                    </label>

                    {/* Assigned Provider (disabled placeholder for future scoping) */}
                    <label className="flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Assigned Provider (optional)</span>
                        <select
                            className="flex-1 rounded-lg border px-3 py-2 outline-none disabled:bg-gray-50"
                            disabled
                            value=""
                            onChange={() => undefined}
                        >
                            <option value="">(None)</option>
                        </select>
                        <span className="mt-1 text-xs text-gray-500">
                            <span className="font-medium">Provider scoping</span> coming soon.
                        </span>
                    </label>

                    {/* Description */}
                    <label className="md:col-span-2 flex flex-col text-sm">
                        <span className="mb-1 font-medium text-gray-700">Description</span>
                        <textarea
                            className="min-h-[80px] rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                            placeholder="Optional details clients will see during booking."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </label>

                    {/* Flags - single non-wrapping line */}
                    <div className="col-span-1 md:col-span-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap text-sm">
                        <label className="inline-flex items-center gap-2 whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            Allow Clients to Self-Book this Appointment Type
                        </label>
                        <label className="inline-flex items-center gap-2 whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={requiresWaiver}
                                onChange={(e) => setRequiresWaiver(e.target.checked)}
                            />
                            Requires waiver
                        </label>
                    </div>
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
