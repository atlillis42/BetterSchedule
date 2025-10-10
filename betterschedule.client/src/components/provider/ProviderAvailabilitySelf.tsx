import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@auth/auth-context";
import {
    listAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    ensureDefaultAvailability,
} from "@api/provider-availability-api";
import type {
    ProviderAvailabilityDto,
    CreateProviderAvailabilityDto,
    UpdateProviderAvailabilityDto,
    DayOfWeek,
} from "@/types/providerAvailabilityTypes";

/**
 * Self-service provider availability editor.
 * - Providers manage their own weekly rules.
 * - Managers may also use this page, but it always targets the *current user*.
 * - “Ensure defaults” delegates to the server to create Mon–Fri rows from org business hours
 *   when none exist (idempotent).
 */
const ProviderAvailabilitySelf: React.FC = () => {
    const { userId, isManager, isProvider, loading: authLoading } = useAuth();

    const [items, setItems] = useState<ProviderAvailabilityDto[]>([]);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<FormState | null>(null);
    const [initialFetch, setInitialFetch] = useState(true);

    /** Loads the current user's availability. */
    const load = async () => {
        if (!userId) return;
        try {
            setBusy(true);
            const data = await listAvailability(userId);
            setItems(data.filter((r) => r.serviceProviderId === userId));
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to load availability.");
        } finally {
            setBusy(false);
            setInitialFetch(false);
        }
    };

    useEffect(() => {
        if (!authLoading) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, userId]);

    const onEnsureDefault = async () => {
        if (!userId) return;
        try {
            const { created, count } = await ensureDefaultAvailability(userId);
            if (created) toast.success(`Created ${count} default rows based on org business hours.`);
            else toast.info("Defaults already exist.");
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to ensure defaults.");
        }
    };

    const onQuickWeek = async () => {
        if (!userId) return;
        const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const exists = new Set(
            items.map(
                (r) =>
                    `${r.dayOfWeek}|${r.startLocalTime}|${r.endLocalTime}|${r.effectiveFrom}|${r.effectiveTo}`
            )
        );
        let created = 0;

        for (const d of DAYS) {
            const key = `${d}|09:00:00|17:00:00|2099-01-01|2099-12-31`;
            if (!exists.has(key)) {
                try {
                    const payload: CreateProviderAvailabilityDto = {
                        serviceProviderId: userId,
                        dayOfWeek: d,
                        startLocalTime: "09:00:00",
                        endLocalTime: "17:00:00",
                        effectiveFrom: "2099-01-01",
                        effectiveTo: "2099-12-31",
                    };
                    const row = await createAvailability(payload);
                    setItems((prev) => [...prev, row]);
                    created++;
                } catch (e: any) {
                    toast.error(e?.response?.data?.message ?? `Failed to create ${d}`);
                }
            }
        }

        if (created > 0) toast.success(`Added ${created} default ${created === 1 ? "day" : "days"}.`);
        else toast.info("All weekdays already present.");
    };

    const onDelete = async (row: ProviderAvailabilityDto) => {
        if (!confirm("Delete this availability row?")) return;
        try {
            await deleteAvailability(row.id);
            setItems((prev) => prev.filter((r) => r.id !== row.id));
            toast.success("Deleted");
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Delete failed");
        }
    };

    const onSave = async () => {
        if (!editing || !userId) return;
        const err = validateForm(editing);
        if (err) {
            toast.error(err);
            return;
        }

        const payloadBase = {
            serviceProviderId: userId,
            dayOfWeek: editing.dayOfWeek,
            startLocalTime: ensureHms(editing.startLocalTime),
            endLocalTime: ensureHms(editing.endLocalTime),
            effectiveFrom: editing.effectiveFrom,
            effectiveTo: editing.effectiveTo,
        };

        try {
            if (editing.id) {
                const patch: UpdateProviderAvailabilityDto = { ...payloadBase };
                await updateAvailability(editing.id, patch);
                setItems((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...patch } as any : r)));
                toast.success("Updated");
            } else {
                const crt: CreateProviderAvailabilityDto = { ...payloadBase };
                const created = await createAvailability(crt);
                setItems((prev) => [...prev, created]);
                toast.success("Created");
            }
            setEditing(null);
        } catch (e: any) {
            const msg = e?.response?.data ?? e?.message ?? "Save failed";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    const DAYS: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const grouped = useMemo(() => {
        const map = new Map<DayOfWeek, ProviderAvailabilityDto[]>();
        for (const d of DAYS) map.set(d, []);
        for (const it of items) map.get(it.dayOfWeek)!.push(it);
        for (const d of DAYS) map.get(d)!.sort((a, b) => a.startLocalTime.localeCompare(b.startLocalTime));
        return map;
    }, [items]);

    if (authLoading || (initialFetch && busy)) {
        return <div className="p-6 text-sm text-gray-600">Loading…</div>;
    }

    const canEdit = isProvider || isManager;

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold">My Availability</h1>
                    {!isProvider && (
                        <p className="text-xs text-gray-600 mt-1">
                            You’re not assigned the <b>ServiceProvider</b> role. You can use the Manager page to
                            manage other providers’ availability.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button className="border rounded px-3 py-2" onClick={load} disabled={busy}>
                        Refresh
                    </button>
                    <button className="border rounded px-3 py-2" onClick={onEnsureDefault} disabled={!canEdit || busy}>
                        Ensure my defaults
                    </button>
                    <button className="border rounded px-3 py-2" onClick={onQuickWeek} disabled={!canEdit || busy}>
                        Add Mon–Fri 09:00–17:00
                    </button>
                    <button
                        className="border rounded px-3 py-2"
                        onClick={() => setEditing(makeDefaultForm())}
                        disabled={!canEdit || busy}
                    >
                        Add Row
                    </button>
                </div>
            </header>

            {items.length === 0 && (
                <div className="text-sm text-gray-600">
                    No availability found. Use <b>Ensure my defaults</b> or <b>Add Row</b> to get started.
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS.map((d) => (
                    <div key={d} className="rounded-xl border p-3 shadow-sm bg-white">
                        <div className="font-medium mb-2">{d}</div>
                        <ul className="space-y-2">
                            {grouped.get(d)!.length === 0 && (
                                <li className="text-sm text-gray-500">No availability</li>
                            )}
                            {grouped.get(d)!.map((row) => (
                                <li
                                    key={row.id}
                                    className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
                                >
                                    <div className="text-sm">
                                        <div>
                                            {toHHmm(row.startLocalTime)}–{toHHmm(row.endLocalTime)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {row.effectiveFrom} → {row.effectiveTo}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="text-blue-600 hover:underline"
                                            onClick={() => setEditing(toForm(row))}
                                            disabled={!canEdit}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 hover:underline"
                                            onClick={() => onDelete(row)}
                                            disabled={!canEdit}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {editing && (
                <EditModal
                    value={editing}
                    onChange={setEditing}
                    onCancel={() => setEditing(null)}
                    onSave={onSave}
                    DAYS={DAYS}
                />
            )}
        </div>
    );
};

export default ProviderAvailabilitySelf;

/** ---------------- UI helpers ---------------- */

type FormState = {
    id?: number;
    dayOfWeek: DayOfWeek;
    startLocalTime: string;  // "HH:mm" in UI; saved as "HH:mm:ss"
    endLocalTime: string;    // "HH:mm" in UI; saved as "HH:mm:ss"
    effectiveFrom: string;   // "YYYY-MM-DD"
    effectiveTo: string;     // "YYYY-MM-DD"
};

/** Maps a DTO row into the local form state. */
function toForm(r: ProviderAvailabilityDto): FormState {
    return {
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startLocalTime: toHHmm(r.startLocalTime),
        endLocalTime: toHHmm(r.endLocalTime),
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
    };
}

/** Prepopulates a sensible new-row form for today's weekday. */
function makeDefaultForm(): FormState {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const names: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
        dayOfWeek: names[today.getDay()],
        startLocalTime: "09:00",
        endLocalTime: "17:00",
        effectiveFrom: iso,
        effectiveTo: "2099-12-31",
    };
}

const toHHmm = (t: string) => (t.length === 5 ? t : t.slice(0, 5));
const ensureHms = (t: string) => (t.length === 5 ? `${t}:00` : t);
const isAfter = (a: string, b: string) => a.localeCompare(b) > 0;

/** Validates the local form before POST/PUT. */
function validateForm(f: FormState) {
    if (isAfter(f.startLocalTime, f.endLocalTime)) return "End time must be after start time.";
    if (f.effectiveTo < f.effectiveFrom) return "Effective to date must be on or after effective from date.";
    return null;
}

/** Simple modal used for add/edit. */
function EditModal({
    value, onChange, onCancel, onSave, DAYS,
}: {
    value: FormState;
    onChange: (v: FormState) => void;
    onCancel: () => void;
    onSave: () => void;
    DAYS: DayOfWeek[];
}) {
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4">
                <h2 className="text-lg font-semibold">{value.id ? "Edit" : "Add"} Availability</h2>

                <div className="grid grid-cols-2 gap-3">
                    <label className="col-span-2 text-sm">
                        Day of week
                        <select
                            className="w-full border rounded px-2 py-2"
                            value={value.dayOfWeek}
                            onChange={(e) => onChange({ ...value, dayOfWeek: e.target.value as DayOfWeek })}
                        >
                            {DAYS.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm">
                        Start
                        <input
                            type="time"
                            className="w-full border rounded px-2 py-2"
                            value={value.startLocalTime}
                            onChange={(e) => onChange({ ...value, startLocalTime: e.target.value })}
                        />
                    </label>

                    <label className="text-sm">
                        End
                        <input
                            type="time"
                            className="w-full border rounded px-2 py-2"
                            value={value.endLocalTime}
                            onChange={(e) => onChange({ ...value, endLocalTime: e.target.value })}
                        />
                    </label>

                    <label className="text-sm">
                        Effective from
                        <input
                            type="date"
                            className="w-full border rounded px-2 py-2"
                            value={value.effectiveFrom}
                            onChange={(e) => onChange({ ...value, effectiveFrom: e.target.value })}
                        />
                    </label>

                    <label className="text-sm">
                        Effective to
                        <input
                            type="date"
                            className="w-full border rounded px-2 py-2"
                            value={value.effectiveTo}
                            onChange={(e) => onChange({ ...value, effectiveTo: e.target.value })}
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button className="px-4 py-2 rounded border" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={onSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
