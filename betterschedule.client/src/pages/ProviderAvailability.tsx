import { useEffect, useMemo, useState } from "react";
import {
    listAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
} from "@api/provider-availability-api";
import type { ProviderAvailabilityDto } from "@/types/providerAvailabilityTypes";
import type {
    CreateProviderAvailabilityDto,
    UpdateProviderAvailabilityDto,
    DayOfWeek,
} from "@/types/providerAvailabilityTypes";

import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-toastify";

const DAYS: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type FormState = {
    id?: number;
    dayOfWeek: DayOfWeek;
    startLocalTime: string; // "HH:mm"
    endLocalTime: string;   // "HH:mm"
    effectiveFrom: string;  // "YYYY-MM-DD"
    effectiveTo: string;    // "YYYY-MM-DD"
};

const toHHmm = (t: string) => (t.length === 5 ? t : t.slice(0, 5));
const isAfter = (a: string, b: string) => a.localeCompare(b) > 0;

export default function ProviderAvailabilityPage() {
    const { userId, isManager, isProvider, isClient, loading } = useAuth();

    const [providerId, setProviderId] = useState<string | undefined>(
        isProvider && !isManager ? userId ?? undefined : undefined
    );

    const [items, setItems] = useState<ProviderAvailabilityDto[]>([]);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<FormState | null>(null);

    const canEdit = isManager || isProvider;
    const canPickProvider = isManager || isClient;

    const load = async () => {
        try {
            setBusy(true);
            const data = await listAvailability(providerId);
            setItems(data);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to load availability");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId]);

    const onAdd = () => {
        if (!canEdit) return;

        // 👋 Friendly nudge: Providers can only add for themselves
        if (isProvider && !isManager && providerId && providerId !== userId) {
            toast.info("You’re viewing another provider’s availability. Switch to yourself to add your own hours.");
            return;
        }

        const today = new Date();
        const isoDate = today.toISOString().slice(0, 10);
        setEditing({
            dayOfWeek: DAYS[today.getDay()],
            startLocalTime: "09:00",
            endLocalTime: "17:00",
            effectiveFrom: isoDate,
            effectiveTo: "2099-12-31",
        });
    };

    const onEdit = (row: ProviderAvailabilityDto) => {
        // 👋 Friendly nudge: Providers cannot edit others' rows
        if (isProvider && !isManager && row.serviceProviderId !== userId) {
            toast.info("You're viewing another provider’s availability. Switch the selector to yourself to edit your own hours.");
            return;
        }

        if (!canEdit) return;

        setEditing({
            id: row.id,
            dayOfWeek: row.dayOfWeek,
            startLocalTime: toHHmm(row.startLocalTime),
            endLocalTime: toHHmm(row.endLocalTime),
            effectiveFrom: row.effectiveFrom,
            effectiveTo: row.effectiveTo,
        });
    };

    const onDelete = async (row: ProviderAvailabilityDto) => {
        // 👋 Friendly nudge: Providers cannot delete others' rows
        if (isProvider && !isManager && row.serviceProviderId !== userId) {
            toast.info("You can only delete your own availability. Switch the selector to yourself to make changes.");
            return;
        }

        if (!canEdit) return;

        if (!confirm("Delete this availability row?")) return;
        try {
            await deleteAvailability(row.id);
            toast.success("Deleted");
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data ?? "Delete failed");
        }
    };

    const validateForm = (f: FormState) => {
        if (isAfter(f.startLocalTime, f.endLocalTime)) return "End time must be after start time.";
        if (f.effectiveTo < f.effectiveFrom) return "Effective to date must be on or after effective from date.";
        return null;
    };

    const onSave = async () => {
        if (!editing) return;
        const selectedProviderId = isManager ? providerId : isProvider ? userId : undefined;
        if (!selectedProviderId) {
            toast.error("Select a provider before saving.");
            return;
        }

        const err = validateForm(editing);
        if (err) {
            toast.error(err);
            return;
        }

        const payloadBase = {
            serviceProviderId: selectedProviderId,
            dayOfWeek: editing.dayOfWeek,
            startLocalTime: editing.startLocalTime,
            endLocalTime: editing.endLocalTime,
            effectiveFrom: editing.effectiveFrom,
            effectiveTo: editing.effectiveTo,
        };

        try {
            if (editing.id) {
                const upd: UpdateProviderAvailabilityDto = { ...payloadBase };
                await updateAvailability(editing.id, upd);
                toast.success("Updated");
            } else {
                const crt: CreateProviderAvailabilityDto = { ...payloadBase };
                await createAvailability(crt);
                toast.success("Created");
            }
            setEditing(null);
            await load();
        } catch (e: any) {
            const msg = e?.response?.data ?? e?.message ?? "Save failed";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    const grouped = useMemo(() => {
        const map = new Map<DayOfWeek, ProviderAvailabilityDto[]>();
        for (const d of DAYS) map.set(d, []);
        for (const it of items) map.get(it.dayOfWeek)!.push(it);
        for (const d of DAYS) map.get(d)!.sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime));
        return map;
    }, [items]);

    if (loading) return <div className="p-6">Loading…</div>;

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">Provider Availability</h1>
                <div className="flex items-center gap-3">
                    {canPickProvider && (
                        <input
                            className="input input-bordered px-3 py-2 rounded border"
                            placeholder="Filter by provider userId…"
                            value={providerId ?? ""}
                            onChange={(e) => setProviderId(e.target.value || undefined)}
                            title="Enter a provider's userId to filter, or clear to see all"
                        />
                    )}
                    <button
                        className="btn px-4 py-2 rounded bg-gray-100 border disabled:opacity-50"
                        onClick={load}
                        disabled={busy}
                    >
                        Refresh
                    </button>
                    {canEdit && (
                        <button className="btn px-4 py-2 rounded bg-blue-600 text-white" onClick={onAdd}>
                            Add
                        </button>
                    )}
                </div>
            </header>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((d) => (
                    <div key={d} className="rounded-xl border p-3 shadow-sm">
                        <div className="font-medium mb-2">{d}</div>
                        <ul className="space-y-2">
                            {grouped.get(d)!.length === 0 && <li className="text-sm text-gray-500">No availability</li>}
                            {grouped.get(d)!.map((row) => {
                                const showEdit = canEdit && (isManager || row.serviceProviderId === userId);
                                return (
                                    <li key={row.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
                                        <div className="text-sm">
                                            <div>{toHHmm(row.startLocalTime)}–{toHHmm(row.endLocalTime)}</div>
                                            <div className="text-xs text-gray-500">{row.effectiveFrom} → {row.effectiveTo}</div>
                                            {isManager && (
                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                    Provider: <span className="font-mono">{row.serviceProviderId}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {showEdit ? (
                                                <>
                                                    <button className="text-blue-600 hover:underline" onClick={() => onEdit(row)}>Edit</button>
                                                    <button className="text-red-600 hover:underline" onClick={() => onDelete(row)}>Delete</button>
                                                </>
                                            ) : (
                                                (isProvider && !isManager) ? (
                                                    <button
                                                        className="text-gray-400 cursor-not-allowed"
                                                        title="Switch the selector to yourself to edit your own hours"
                                                        onClick={() => {
                                                            toast.info("You’re viewing another provider’s availability. Switch the selector to yourself to edit.");
                                                        }}
                                                    >
                                                        View only
                                                    </button>
                                                ) : null
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w/full max-w-lg space-y-4">
                        <h2 className="text-lg font-semibold">{editing.id ? "Edit" : "Add"} Availability</h2>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="col-span-2 text-sm">
                                Day of week
                                <select
                                    className="w-full border rounded px-2 py-2"
                                    value={editing.dayOfWeek}
                                    onChange={(e) => setEditing({ ...editing, dayOfWeek: e.target.value as DayOfWeek })}
                                >
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </label>

                            <label className="text-sm">
                                Start
                                <input
                                    type="time"
                                    className="w-full border rounded px-2 py-2"
                                    value={editing.startLocalTime}
                                    onChange={(e) => setEditing({ ...editing, startLocalTime: e.target.value })}
                                />
                            </label>

                            <label className="text-sm">
                                End
                                <input
                                    type="time"
                                    className="w-full border rounded px-2 py-2"
                                    value={editing.endLocalTime}
                                    onChange={(e) => setEditing({ ...editing, endLocalTime: e.target.value })}
                                />
                            </label>

                            <label className="text-sm">
                                Effective from
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-2"
                                    value={editing.effectiveFrom}
                                    onChange={(e) => setEditing({ ...editing, effectiveFrom: e.target.value })}
                                />
                            </label>

                            <label className="text-sm">
                                Effective to
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-2"
                                    value={editing.effectiveTo}
                                    onChange={(e) => setEditing({ ...editing, effectiveTo: e.target.value })}
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button className="px-4 py-2 rounded border" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
