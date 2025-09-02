import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getProvidersLite, type UserLite } from "@/api/user-api";
import {
    listAvailability,
    ensureDefaultAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
} from "@/api/provider-availability-api";
import type {
    ProviderAvailabilityDto,
    CreateProviderAvailabilityDto,
    UpdateProviderAvailabilityDto,
    DayOfWeek,
} from "@/types/providerAvailabilityTypes";

/**
 * Manager page to view and modify any provider’s weekly availability.
 * - Select a provider and manage their rules.
 * - Ensure defaults using org business hours when empty.
 * - Quick-add Mon–Fri 09:00–17:00 for gaps.
 * - Edit rows with a modal; server-side validation mirrors the DTO contract.
 */
export default function ProviderAvailabilityManager() {
    const [providers, setProviders] = useState<UserLite[]>([]);
    const [providerId, setProviderId] = useState<string>("");
    const [items, setItems] = useState<ProviderAvailabilityDto[]>([]);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<FormState | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const prov = await getProvidersLite();
                setProviders(prov);
                setProviderId((p) => p || prov[0]?.id || "");
            } catch (e: any) {
                toast.error(e?.message ?? "Failed to load providers.");
            }
        })();
    }, []);

    useEffect(() => {
        if (!providerId) return;
        (async () => {
            try {
                setBusy(true);
                const data = await listAvailability(providerId);
                setItems(data);
            } catch (e: any) {
                toast.error(e?.response?.data?.message ?? "Failed to load availability.");
            } finally {
                setBusy(false);
            }
        })();
    }, [providerId]);

    const refresh = async () => {
        if (!providerId) return;
        try {
            setBusy(true);
            const data = await listAvailability(providerId);
            setItems(data);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to refresh availability.");
        } finally {
            setBusy(false);
        }
    };

    const onEnsureDefault = async () => {
        if (!providerId) return;
        try {
            const { created, count } = await ensureDefaultAvailability(providerId);
            if (created) toast.success(`Created ${count} default rows.`);
            else toast.info("Defaults already exist.");
            await refresh();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed to ensure defaults.");
        }
    };

    const onEnsureDefaultsForAll = async () => {
        setBulkBusy(true);
        try {
            const results = await Promise.allSettled(
                providers.map((p) => ensureDefaultAvailability(p.id))
            );
            const created = results.reduce((acc, r) => acc + (r.status === "fulfilled" && r.value.created ? r.value.count : 0), 0);
            if (created > 0) toast.success(`Created ${created} default rows across providers.`);
            else toast.info("All providers already have defaults.");
            await refresh();
        } catch {
            toast.error("Bulk ensure failed.");
        } finally {
            setBulkBusy(false);
        }
    };

    const onQuickWeek = async () => {
        const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const exists = new Set(
            items.map((r) => `${r.dayOfWeek}|${r.startLocalTime}|${r.endLocalTime}|${r.effectiveFrom}|${r.effectiveTo}`)
        );
        let created = 0;

        for (const d of DAYS) {
            const key = `${d}|09:00:00|17:00:00|2099-01-01|2099-12-31`;
            if (!exists.has(key)) {
                try {
                    const payload: CreateProviderAvailabilityDto = {
                        serviceProviderId: providerId,
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

    const onDeleteRow = async (row: ProviderAvailabilityDto) => {
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
        if (!editing) return;
        const err = validateForm(editing);
        if (err) {
            toast.error(err);
            return;
        }
        const payloadBase = {
            serviceProviderId: providerId,
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

    const selectedName = useMemo(
        () => providers.find((p) => p.id === providerId)?.name ?? providerId,
        [providers, providerId]
    );

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold">Provider Availability (Manager)</h1>
                    <select
                        className="border rounded px-2 py-1"
                        value={providerId}
                        onChange={(e) => setProviderId(e.target.value)}
                    >
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                    <button className="border rounded px-3 py-1" onClick={refresh} disabled={!providerId || busy}>
                        Refresh
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button className="border rounded px-3 py-2" onClick={onEnsureDefault} disabled={!providerId || busy}>
                        Ensure defaults for this provider
                    </button>
                    <button className="border rounded px-3 py-2" onClick={onQuickWeek} disabled={!providerId || busy}>
                        Add Mon–Fri 09:00–17:00
                    </button>
                    <button
                        className="border rounded px-3 py-2"
                        onClick={() => setEditing(makeDefaultForm())}
                        disabled={!providerId || busy}
                    >
                        Add Row
                    </button>
                    <button
                        className="border rounded px-3 py-2"
                        onClick={onEnsureDefaultsForAll}
                        disabled={bulkBusy || providers.length === 0}
                        title="Idempotent; uses org business hours"
                    >
                        {bulkBusy ? "Bulk Ensuring…" : "Ensure defaults (all providers)"}
                    </button>
                </div>
            </header>

            <div className="text-sm text-gray-600">
                Managing: <b>{selectedName}</b>
            </div>

            {busy ? (
                <div className="text-sm text-gray-600">Loading…</div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DAYS.map((d) => (
                        <div key={d} className="rounded-xl border p-3 shadow-sm">
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
                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                                Provider: <span className="font-mono">{row.serviceProviderId}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="text-blue-600 hover:underline" onClick={() => setEditing(toForm(row))}>
                                                Edit
                                            </button>
                                            <button className="text-red-600 hover:underline" onClick={() => onDeleteRow(row)}>
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

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
}

/** ---------- UI helpers ---------- */

type FormState = {
    id?: number;
    dayOfWeek: DayOfWeek;
    startLocalTime: string;  // "HH:mm" in UI; save as HH:mm:ss
    endLocalTime: string;    // "HH:mm" in UI
    effectiveFrom: string;   // "YYYY-MM-DD"
    effectiveTo: string;     // "YYYY-MM-DD"
};

const toForm = (r: ProviderAvailabilityDto): FormState => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startLocalTime: toHHmm(r.startLocalTime),
    endLocalTime: toHHmm(r.endLocalTime),
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
});

const makeDefaultForm = (): FormState => {
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10);
    const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
        dayOfWeek: dayNames[today.getDay()],
        startLocalTime: "09:00",
        endLocalTime: "17:00",
        effectiveFrom: isoDate,
        effectiveTo: "2099-12-31",
    };
};

const toHHmm = (t: string) => (t.length === 5 ? t : t.slice(0, 5));
const ensureHms = (t: string) => (t.length === 5 ? `${t}:00` : t);
const isAfter = (a: string, b: string) => a.localeCompare(b) > 0;

const validateForm = (f: FormState) => {
    if (isAfter(f.startLocalTime, f.endLocalTime)) return "End time must be after start time.";
    if (f.effectiveTo < f.effectiveFrom) return "Effective to date must be on or after effective from date.";
    return null;
};

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
