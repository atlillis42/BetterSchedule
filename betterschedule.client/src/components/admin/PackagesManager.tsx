import React, { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
    listPackages,
    createPackage,
    updatePackage,
    deletePackage,
    type PackageDto,
    type CreatePackageDto,
    type UpdatePackageDto,
} from "@/api/package-api";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { getProvidersLite } from "@/api/user-api";
import { useAuth } from "@auth/AuthContext";

/**
 * Lightweight provider reference for form pickers.
 */
type ProviderLite = { id: string; name: string };

/**
 * Local form state for create/edit.
 * Empty string values allow “unset” inputs that map cleanly to nullable payloads.
 */
type FormState = {
    id?: number;
    name: string;
    appointmentTypeId: number | "";
    totalUses: number | "";
    providerLocked: boolean;
    providerId: string | "";
    /** Blank => no expiry (null) */
    expiresAfterDays: number | "";
    isActive: boolean;
};

/** Factory for a pristine form. */
const emptyForm = (): FormState => ({
    name: "",
    appointmentTypeId: "",
    totalUses: "",
    providerLocked: false,
    providerId: "",
    expiresAfterDays: "",
    isActive: true,
});

/**
 * Manager UI for package templates.
 *
 * @remarks
 * - Create/Update mirror server validation; errors are surfaced as toasts.
 * - Delete maps to server soft-off (IsActive=false).
 */
const PackagesManager: React.FC = () => {
    const { isManager } = useAuth();
    const canEdit = isManager;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<PackageDto[]>([]);
    const [types, setTypes] = useState<AppointmentTypeDto[]>([]);
    const [providers, setProviders] = useState<ProviderLite[]>([]);

    const [filterActiveOnly, setFilterActiveOnly] = useState(true);
    const [filterTypeId, setFilterTypeId] = useState<number | "">("");

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    /** Map of appointment type id -> dto for quick lookup. */
    const typeById = useMemo(() => {
        const map = new Map<number, AppointmentTypeDto>();
        types.forEach((t) => map.set(t.id, t));
        return map;
    }, [types]);

    /** Resolves a provider display name from its id (fallback to raw id). */
    const providerName = (id?: string | null) => providers.find((p) => p.id === id)?.name || id || "";

    /** Loads reference data + filtered package list. */
    const load = async () => {
        setLoading(true);
        try {
            const [t, p] = await Promise.all([
                getAppointmentTypes(),
                getProvidersLite().catch(() => [] as ProviderLite[]),
            ]);
            setTypes(t);
            setProviders(p ?? []);
            const list = await listPackages({
                activeOnly: filterActiveOnly,
                appointmentTypeId: typeof filterTypeId === "number" ? filterTypeId : undefined,
            });
            setItems(list);
        } catch {
            toast.error("Failed to load packages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterActiveOnly, filterTypeId]);

    useEffect(() => {
        if (showModal && firstInputRef.current) firstInputRef.current.focus();
    }, [showModal]);

    /** Opens the create dialog. */
    const openCreate = () => {
        setForm(emptyForm());
        setShowModal(true);
    };

    /** Opens the edit dialog pre-filled with a row. */
    const openEdit = (pkg: PackageDto) => {
        setForm({
            id: pkg.id,
            name: pkg.name,
            appointmentTypeId: pkg.appointmentTypeId,
            totalUses: pkg.totalUses,
            providerLocked: pkg.providerLocked,
            providerId: pkg.providerId || "",
            expiresAfterDays: pkg.expiresAfterDays ?? "",
            isActive: pkg.isActive,
        });
        setShowModal(true);
    };

    /** Validates and maps form -> create payload. */
    const toCreatePayload = (f: FormState): CreatePackageDto | null => {
        if (!f.name.trim()) {
            toast.error("Name is required.");
            return null;
        }
        if (f.appointmentTypeId === "" || f.appointmentTypeId == null) {
            toast.error("Appointment Type is required.");
            return null;
        }
        if (f.totalUses === "" || Number(f.totalUses) <= 0) {
            toast.error("Total uses must be greater than 0.");
            return null;
        }
        if (f.providerLocked && !String(f.providerId).trim()) {
            toast.error("Select a provider or turn off the lock.");
            return null;
        }
        return {
            name: f.name.trim(),
            appointmentTypeId: Number(f.appointmentTypeId),
            totalUses: Number(f.totalUses),
            providerLocked: !!f.providerLocked,
            providerId: f.providerLocked ? String(f.providerId) : null,
            expiresAfterDays: f.expiresAfterDays === "" ? null : Math.max(1, Number(f.expiresAfterDays || 0)),
            isActive: !!f.isActive,
        };
    };

    /** Validates and maps form -> update payload (full patch for simplicity). */
    const toUpdatePayload = (f: FormState): UpdatePackageDto | null => {
        const createLike = toCreatePayload(f);
        if (!createLike) return null;
        const patch: UpdatePackageDto = {
            name: createLike.name,
            appointmentTypeId: createLike.appointmentTypeId,
            totalUses: createLike.totalUses,
            providerLocked: createLike.providerLocked,
            providerId: createLike.providerId ?? null,
            expiresAfterDays: createLike.expiresAfterDays ?? null,
            isActive: createLike.isActive,
        };
        return patch;
    };

    /** Persists the create/update operation. */
    const handleSave = async () => {
        if (!canEdit) return;

        setSaving(true);
        try {
            if (form.id) {
                const payload = toUpdatePayload(form);
                if (!payload) return;
                await updatePackage(form.id, payload);
                toast.success("Package updated.");
            } else {
                const payload = toCreatePayload(form);
                if (!payload) return;
                await createPackage(payload);
                toast.success("Package created.");
            }
            setShowModal(false);
            await load();
        } catch (err: any) {
            const message =
                err?.response?.data ??
                err?.response?.data?.message ??
                (err instanceof Error ? err.message : "Save failed.");
            toast.error(typeof message === "string" ? message : "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    /** Soft-off (IsActive=false) for a package. */
    const handleDelete = async (id: number) => {
        if (!canEdit) return;
        if (!window.confirm("Turn this package off (IsActive = false)?")) return;
        try {
            await deletePackage(id);
            toast.success("Package turned off.");
            await load();
        } catch {
            toast.error("Delete failed.");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Packages</h1>
                <div className="flex items-center gap-2">
                    <label className="text-sm flex items-center gap-2">
                        <span>Active only</span>
                        <input
                            type="checkbox"
                            checked={filterActiveOnly}
                            onChange={(e) => setFilterActiveOnly(e.target.checked)}
                        />
                    </label>
                    <select
                        className="border rounded px-2 py-1 text-sm"
                        value={filterTypeId === "" ? "" : String(filterTypeId)}
                        onChange={(e) => setFilterTypeId(e.target.value ? Number(e.target.value) : "")}
                    >
                        <option value="">All types</option>
                        {types.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    {canEdit && (
                        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={openCreate}>
                            New Package
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-sm text-gray-600">Loading…</div>
            ) : (
                <div className="overflow-auto rounded border bg-white">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Appointment Type</th>
                                <th className="px-3 py-2">Total Uses</th>
                                <th className="px-3 py-2">Provider Lock</th>
                                <th className="px-3 py-2">Expiry (days)</th>
                                <th className="px-3 py-2">Active</th>
                                <th className="px-3 py-2 w-40">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td className="px-3 py-4 text-gray-500" colSpan={7}>
                                        No packages found.
                                    </td>
                                </tr>
                            ) : (
                                items.map((p) => (
                                    <tr key={p.id} className="border-t">
                                        <td className="px-3 py-2">{p.name}</td>
                                        <td className="px-3 py-2">
                                            {p.appointmentTypeName ?? typeById.get(p.appointmentTypeId)?.name ?? p.appointmentTypeId}
                                        </td>
                                        <td className="px-3 py-2">{p.totalUses}</td>
                                        <td className="px-3 py-2">
                                            {p.providerLocked ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="rounded bg-gray-800 text-white text-[10px] px-1 py-0.5">locked</span>
                                                    <span className="text-gray-700">{p.providerName ?? providerName(p.providerId)}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {p.expiresAfterDays ?? <span className="text-gray-500">—</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            {p.isActive ? (
                                                <span className="rounded bg-green-100 text-green-700 px-2 py-0.5">Active</span>
                                            ) : (
                                                <span className="rounded bg-gray-100 text-gray-600 px-2 py-0.5">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                {canEdit && (
                                                    <>
                                                        <button className="px-2 py-1 rounded border" onClick={() => openEdit(p)}>
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="px-2 py-1 rounded border text-red-700"
                                                            onClick={() => handleDelete(p.id)}
                                                        >
                                                            Turn Off
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div className="font-medium">{form.id ? "Edit Package" : "New Package"}</div>
                            <button className="text-sm text-gray-600" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Name</span>
                                <input
                                    ref={firstInputRef}
                                    className="border rounded px-3 py-2"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    disabled={!canEdit || saving}
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Appointment Type</span>
                                <select
                                    className="border rounded px-3 py-2"
                                    value={form.appointmentTypeId === "" ? "" : String(form.appointmentTypeId)}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            appointmentTypeId: e.target.value ? Number(e.target.value) : "",
                                        })
                                    }
                                    disabled={!canEdit || saving}
                                >
                                    <option value="">Select type</option>
                                    {types.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Total Uses</span>
                                <input
                                    type="number"
                                    min={1}
                                    className="border rounded px-3 py-2"
                                    value={form.totalUses}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            totalUses: e.target.value === "" ? "" : Math.max(1, Number(e.target.value || 0)),
                                        })
                                    }
                                    disabled={!canEdit || saving}
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.providerLocked}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                providerLocked: e.target.checked,
                                                providerId: e.target.checked ? form.providerId : "",
                                            })
                                        }
                                        disabled={!canEdit || saving}
                                    />
                                    <span className="text-sm">Lock to provider</span>
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-sm">Provider</span>
                                    <select
                                        className="border rounded px-3 py-2"
                                        disabled={!form.providerLocked || !canEdit || saving}
                                        value={form.providerId}
                                        onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                                    >
                                        <option value="">(none)</option>
                                        {providers.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name || p.id}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Expires After (days)</span>
                                <input
                                    type="number"
                                    min={1}
                                    className="border rounded px-3 py-2"
                                    value={form.expiresAfterDays}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            expiresAfterDays: e.target.value === "" ? "" : Math.max(1, Number(e.target.value || 0)),
                                        })
                                    }
                                    placeholder="Leave blank for no expiry"
                                    disabled={!canEdit || saving}
                                />
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    disabled={!canEdit || saving}
                                />
                                <span className="text-sm">Active</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
                            <button className="px-3 py-2 rounded border" onClick={() => setShowModal(false)} disabled={saving}>
                                Cancel
                            </button>
                            {form.id && (
                                <button
                                    className="px-3 py-2 rounded border text-red-700"
                                    onClick={() => form.id && handleDelete(form.id)}
                                    disabled={saving}
                                >
                                    Turn Off
                                </button>
                            )}
                            <button
                                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagesManager;
