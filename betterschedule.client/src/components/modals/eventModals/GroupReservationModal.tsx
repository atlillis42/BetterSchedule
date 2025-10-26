import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ClientSearchInput, ProviderSearchInput } from "@/components/modals/lookup";
import {
    listParticipants,
    addParticipant,
    removeParticipant,
    type ReservationParticipantDto,
} from "@/api/reservation-participants-api";
import { getClientNameCached } from "@/services/clientNameCache";
import { getProviderLiteById } from "@/api/user-api";
import type { PendingParticipantAdd } from "@/hooks/useEventModal";

type Props = {
    mode: "create" | "edit";
    values: any;
    setValues: (updater: (prev: any) => any) => void;
    providers: { id: string; name: string }[];
    reservationId?: number;
};

const DividerLabel: React.FC<{ label: string }> = ({ label }) => (
    <div className="text-[11px] uppercase tracking-wide text-slate-500 px-3 py-1 border-t mt-2 border-slate-200 dark:text-slate-400 dark:border-slate-700">
        {label}
    </div>
);

const GuestAdder: React.FC<{ onAdd: (guest: { guestName: string; guestPhone?: string }) => void }> = ({ onAdd }) => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    return (
        <div className="flex items-center gap-2">
            <input
                className="border rounded px-2 py-2 text-sm flex-1 border-slate-300 bg-white text-slate-900 placeholder-slate-400
                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                placeholder="Guest name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                className="border rounded px-2 py-2 text-sm w-44 border-slate-300 bg-white text-slate-900 placeholder-slate-400
                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />
            <button
                type="button"
                className="px-3 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50
                   dark:border-slate-600 dark:hover:bg-slate-700"
                onClick={() => {
                    const guestName = name.trim();
                    const guestPhone = phone.trim();
                    if (!guestName) {
                        toast.info("Please enter a guest name.");
                        return;
                    }
                    onAdd({ guestName, guestPhone: guestPhone || undefined });
                    setName("");
                    setPhone("");
                }}
            >
                Add
            </button>
        </div>
    );
};

const GroupReservationModal: React.FC<Props> = ({ mode, values, setValues, providers, reservationId }) => {
    const [clientNameMap, setClientNameMap] = useState<Map<string, string>>(new Map());
    const [providerNameMap, setProviderNameMap] = useState<Map<string, string>>(new Map());

    const [loading, setLoading] = useState(false);
    const [clientParticipants, setClientParticipants] = useState<ReservationParticipantDto[]>([]);
    const [providerParticipants, setProviderParticipants] = useState<ReservationParticipantDto[]>([]);
    const [guestParticipants, setGuestParticipants] = useState<ReservationParticipantDto[]>([]);

    const pending: PendingParticipantAdd[] = Array.isArray(values?.pendingParticipants) ? values.pendingParticipants : [];

    const [clientToAddId, setClientToAddId] = useState<string | null>(null);
    const [clientPickerKey, setClientPickerKey] = useState(0);
    const [providerToAddId, setProviderToAddId] = useState<string | null>(null);
    const [providerPickerKey, setProviderPickerKey] = useState(0);

    useEffect(() => {
        if (!providers?.length) return;
        setProviderNameMap((prev) => {
            const next = new Map(prev);
            providers.forEach((p) => next.set(p.id, p.name || p.id));
            return next;
        });
    }, [providers]);

    useEffect(() => {
        let cancelled = false;
        if (mode !== "edit" || !reservationId) return;
        (async () => {
            try {
                setLoading(true);
                const list = await listParticipants(reservationId);
                if (cancelled) return;

                const clients = list.filter((p) => p.role === "Client" && !p.isDeleted);
                const provs = list.filter((p) => p.role === "ServiceProvider" && !p.isDeleted);
                const guests = list.filter((p) => p.role === "Guest" && !p.isDeleted);

                setClientParticipants(clients);
                setProviderParticipants(provs);
                setGuestParticipants(guests);

                const clientIds = new Set<string>();
                if (typeof values?.clientId === "string" && values.clientId) clientIds.add(values.clientId);
                for (const c of clients) if (c.userId) clientIds.add(c.userId);
                if (clientIds.size) {
                    const pairs = await Promise.all(Array.from(clientIds).map(async (id) => [id, await getClientNameCached(id)] as const));
                    if (!cancelled) {
                        const next = new Map<string, string>();
                        pairs.forEach(([id, name]) => next.set(id, name));
                        setClientNameMap(next);
                    }
                }

                const provIds = new Set<string>();
                if (typeof values?.serviceProviderId === "string" && values.serviceProviderId) provIds.add(values.serviceProviderId);
                for (const p of provs) if (p.userId) provIds.add(p.userId);
                if (provIds.size) {
                    const pairs = await Promise.all(
                        Array.from(provIds).map(async (id) => {
                            try {
                                const dto = await getProviderLiteById(id);
                                return [id, dto?.name || id] as const;
                            } catch {
                                return [id, id] as const;
                            }
                        })
                    );
                    if (!cancelled) {
                        setProviderNameMap((prev) => {
                            const next = new Map(prev);
                            pairs.forEach(([id, name]) => next.set(id, name));
                            return next;
                        });
                    }
                }
            } catch (err) {
                if (!cancelled) toast.error((err as Error)?.message || "We couldn't load participants.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mode, reservationId, values?.clientId, values?.serviceProviderId]);

    const primaryClientId: string | undefined =
        typeof values?.clientId === "string" && values.clientId ? values.clientId : undefined;
    const primaryProviderId: string | undefined =
        typeof values?.serviceProviderId === "string" && values.serviceProviderId ? values.serviceProviderId : undefined;

    useEffect(() => {
        if (mode !== "create") return;
        let cancelled = false;

        (async () => {
            try {
                const clientIds = new Set<string>();
                if (primaryClientId) clientIds.add(primaryClientId);
                pending.forEach((p) => { if (p.role === "Client" && p.userId) clientIds.add(p.userId); });
                if (clientIds.size) {
                    const pairs = await Promise.all(Array.from(clientIds).map(async (id) => [id, await getClientNameCached(id)] as const));
                    if (!cancelled) {
                        setClientNameMap((prev) => {
                            const next = new Map(prev);
                            pairs.forEach(([id, name]) => next.set(id, name));
                            return next;
                        });
                    }
                }

                const providerIds = new Set<string>();
                if (primaryProviderId) providerIds.add(primaryProviderId);
                pending.forEach((p) => { if (p.role === "ServiceProvider" && p.userId) providerIds.add(p.userId); });
                if (providerIds.size) {
                    const pairs = await Promise.all(
                        Array.from(providerIds).map(async (id) => {
                            try { const dto = await getProviderLiteById(id); return [id, dto?.name || id] as const; }
                            catch { return [id, id] as const; }
                        })
                    );
                    if (!cancelled) {
                        setProviderNameMap((prev) => {
                            const next = new Map(prev);
                            pairs.forEach(([id, name]) => next.set(id, name));
                            return next;
                        });
                    }
                }
            } catch { /* no-op */ }
        })();

        return () => { cancelled = true; };
    }, [mode, pending, primaryClientId, primaryProviderId]);

    const createSelectedClientIds = useMemo(() => {
        const set = new Set<string>();
        if (primaryClientId) set.add(primaryClientId);
        for (const p of pending) if (p.role === "Client" && p.userId) set.add(p.userId);
        if (primaryProviderId) set.add(primaryProviderId);
        for (const p of pending) if (p.role === "ServiceProvider" && p.userId) set.add(p.userId);
        return set;
    }, [primaryClientId, primaryProviderId, pending]);

    const createSelectedProviderIds = useMemo(() => {
        const set = new Set<string>();
        if (primaryProviderId) set.add(primaryProviderId);
        for (const p of pending) if (p.role === "ServiceProvider" && p.userId) set.add(p.userId);
        if (primaryClientId) set.add(primaryClientId);
        for (const p of pending) if (p.role === "Client" && p.userId) set.add(p.userId);
        return set;
    }, [primaryProviderId, primaryClientId, pending]);

    const editSelectedClientIds = useMemo(() => {
        const set = new Set<string>();
        if (primaryClientId) set.add(primaryClientId);
        for (const p of clientParticipants) if (p.userId) set.add(p.userId);
        if (primaryProviderId) set.add(primaryProviderId);
        for (const p of providerParticipants) if (p.userId) set.add(p.userId);
        return set;
    }, [primaryClientId, primaryProviderId, clientParticipants, providerParticipants]);

    const editSelectedProviderIds = useMemo(() => {
        const set = new Set<string>();
        if (primaryProviderId) set.add(primaryProviderId);
        for (const p of providerParticipants) if (p.userId) set.add(p.userId);
        if (primaryClientId) set.add(primaryClientId);
        for (const p of clientParticipants) if (p.userId) set.add(p.userId);
        return set;
    }, [primaryProviderId, primaryClientId, providerParticipants, clientParticipants]);

    const addPending = (p: PendingParticipantAdd) =>
        setValues((prev: any) => {
            const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants) ? [...prev.pendingParticipants] : [];
            arr.push(p);
            return { ...prev, pendingParticipants: arr };
        });

    const removePendingAt = (index: number) =>
        setValues((prev: any) => {
            const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants) ? [...prev.pendingParticipants] : [];
            arr.splice(index, 1);
            return { ...prev, pendingParticipants: arr };
        });

    const handleRemoveParticipant = async (p: ReservationParticipantDto, role: "Client" | "ServiceProvider" | "Guest") => {
        if (!reservationId) return;
        try {
            if (role === "Client") setClientParticipants((prev) => prev.filter((x) => x.id !== p.id));
            else if (role === "ServiceProvider") setProviderParticipants((prev) => prev.filter((x) => x.id !== p.id));
            else setGuestParticipants((prev) => prev.filter((x) => x.id !== p.id));
            await removeParticipant(reservationId, p.id);
            toast.success("Removed from this reservation.");
        } catch (err) {
            toast.error((err as Error)?.message || "We couldn't remove that person.");
            try {
                const list = await listParticipants(reservationId);
                const clients = list.filter((x) => x.role === "Client" && !x.isDeleted);
                const provs = list.filter((x) => x.role === "ServiceProvider" && !x.isDeleted);
                const guests = list.filter((x) => x.role === "Guest" && !x.isDeleted);
                setClientParticipants(clients);
                setProviderParticipants(provs);
                setGuestParticipants(guests);
            } catch { /* no-op */ }
        }
    };

    const currentProviders = (() => {
        if (mode === "edit") return [...providerParticipants];
        const pend = pending.filter((p) => p.role === "ServiceProvider" && p.userId);
        const uniq = new Map<string, PendingParticipantAdd>();
        if (primaryProviderId) uniq.set(primaryProviderId, { role: "ServiceProvider", userId: primaryProviderId });
        for (const p of pend) if (p.userId) uniq.set(p.userId, { role: "ServiceProvider", userId: p.userId });
        return Array.from(uniq.values());
    })();

    const currentClients = (() => {
        if (mode === "edit") return [...clientParticipants];
        const pend = pending.filter((p) => p.role === "Client" && p.userId);
        const uniq = new Map<string, PendingParticipantAdd>();
        if (primaryClientId) uniq.set(primaryClientId, { role: "Client", userId: primaryClientId });
        for (const p of pend) if (p.userId) uniq.set(p.userId, { role: "Client", userId: p.userId });
        return Array.from(uniq.values());
    })();

    const currentGuests = (() => {
        return mode === "edit" ? [...guestParticipants] : pending.filter((p) => p.role === "Guest");
    })();

    return (
        <div className="flex flex-col gap-6">
            {mode === "edit" && loading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading participants…</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clients */}
                <div>
                    <div className="mb-2 font-medium text-slate-800 dark:text-slate-100">Clients</div>

                    {mode === "edit" && (
                        <div className="flex flex-col gap-2">
                            {clientParticipants.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <ClientSearchInput
                                            valueId={p.userId || null}
                                            initialLabel={p.userId ? clientNameMap.get(p.userId) ?? null : null}
                                            onChange={() => void 0}
                                            placeholder=""
                                            disabled
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => handleRemoveParticipant(p, "Client")}
                                        aria-label="Remove client"
                                        title="Remove"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add client */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1">
                            <ClientSearchInput
                                key={clientPickerKey}
                                valueId={null}
                                initialLabel={null}
                                onChange={(c) => setClientToAddId(c?.id ?? null)}
                                placeholder="Add client…"
                                disabled={false}
                            />
                        </div>
                        <button
                            type="button"
                            className="px-3 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            onClick={async () => {
                                const userId = clientToAddId;
                                if (!userId) return;

                                const inUse = mode === "edit" ? editSelectedClientIds.has(userId) : createSelectedClientIds.has(userId);
                                if (inUse) {
                                    toast.info("That person is already on this reservation.");
                                    return;
                                }

                                if (mode === "edit") {
                                    if (!reservationId) return;
                                    try {
                                        const created = await addParticipant(reservationId, { role: "Client", userId });
                                        const name = await getClientNameCached(userId);
                                        setClientNameMap((prev) => {
                                            const next = new Map(prev);
                                            next.set(userId, name);
                                            return next;
                                        });
                                        setClientParticipants((prev) => [...prev, created]);
                                        setClientToAddId(null);
                                        setClientPickerKey((k) => k + 1);
                                        toast.success("Client added to this reservation.");
                                    } catch (err) {
                                        toast.error((err as Error)?.message || "We couldn't add that client.");
                                    }
                                } else {
                                    try {
                                        const name = await getClientNameCached(userId);
                                        setClientNameMap((prev) => new Map(prev).set(userId, name));
                                    } catch { }
                                    setValues((prev: any) => {
                                        const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants) ? [...prev.pendingParticipants] : [];
                                        arr.push({ role: "Client", userId });
                                        return { ...prev, pendingParticipants: arr };
                                    });
                                    setClientToAddId(null);
                                    setClientPickerKey((k) => k + 1);
                                    toast.success("Client added.");
                                }
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Providers */}
                <div>
                    <div className="mb-2 font-medium text-slate-800 dark:text-slate-100">Service Providers</div>

                    {mode === "edit" && (
                        <div className="flex flex-col gap-2">
                            {providerParticipants.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                    <input
                                        className="flex-1 border rounded-lg px-3 py-2 bg-slate-50 text-slate-800 border-slate-300
                               dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                                        value={providerNameMap.get(p.userId) ?? p.userId}
                                        readOnly
                                    />
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => handleRemoveParticipant(p, "ServiceProvider")}
                                        aria-label="Remove provider"
                                        title="Remove"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add provider */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1">
                            <ProviderSearchInput
                                key={providerPickerKey}
                                valueId={null}
                                initialLabel={null}
                                onChange={(p) => setProviderToAddId(p?.id ?? null)}
                                placeholder="Add provider…"
                                disabled={false}
                                excludeIds={mode === "edit" ? editSelectedProviderIds : createSelectedProviderIds}
                            />
                        </div>
                        <button
                            type="button"
                            className="px-3 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            onClick={async () => {
                                const userId = providerToAddId;
                                if (!userId) return;

                                const inUse = mode === "edit" ? editSelectedProviderIds.has(userId) : createSelectedProviderIds.has(userId);
                                if (inUse) {
                                    toast.info("That person is already on this reservation.");
                                    return;
                                }

                                if (mode === "edit") {
                                    if (!reservationId) return;
                                    try {
                                        const created = await addParticipant(reservationId, { role: "ServiceProvider", userId });
                                        try {
                                            const dto = await getProviderLiteById(userId);
                                            setProviderNameMap((prev) => {
                                                const next = new Map(prev);
                                                next.set(userId, dto?.name || userId);
                                                return next;
                                            });
                                        } catch { /* no-op */ }
                                        setProviderParticipants((prev) => [...prev, created]);
                                        setProviderToAddId(null);
                                        setProviderPickerKey((k) => k + 1);
                                        toast.success("Service provider added to this reservation.");
                                    } catch (err) {
                                        toast.error((err as Error)?.message || "We couldn't add that provider.");
                                    }
                                } else {
                                    try {
                                        const dto = await getProviderLiteById(userId);
                                        setProviderNameMap((prev) => new Map(prev).set(userId, dto?.name || userId));
                                    } catch {
                                        setProviderNameMap((prev) => new Map(prev).set(userId, userId));
                                    }
                                    setValues((prev: any) => {
                                        const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants) ? [...prev.pendingParticipants] : [];
                                        arr.push({ role: "ServiceProvider", userId });
                                        return { ...prev, pendingParticipants: arr };
                                    });
                                    setProviderToAddId(null);
                                    setProviderPickerKey((k) => k + 1);
                                    toast.success("Service provider added.");
                                }
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Guests */}
            <div className="rounded-lg border p-3 border-slate-200 dark:border-slate-700">
                <div className="mb-2 font-medium text-slate-800 dark:text-slate-100">Guests</div>
                <GuestAdder
                    onAdd={async ({ guestName, guestPhone }) => {
                        if (mode === "edit") {
                            if (!reservationId) return;
                            try {
                                await addParticipant(reservationId, { role: "Guest", guestName, guestPhone });
                                toast.success("Guest added to this reservation.");
                            } catch (err) {
                                toast.error((err as Error)?.message || "We couldn't add that guest.");
                            }
                        } else {
                            setValues((prev: any) => {
                                const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants) ? [...prev.pendingParticipants] : [];
                                arr.push({ role: "Guest", guestName, guestPhone });
                                return { ...prev, pendingParticipants: arr };
                            });
                            toast.success("Guest added.");
                        }
                    }}
                />
            </div>

            {/* Current Participants */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="px-3 py-2 text-sm font-medium bg-slate-50 text-slate-800 border-b border-slate-200
                        dark:bg-slate-800/60 dark:text-slate-100 dark:border-slate-700">
                    Current Participants
                </div>

                <DividerLabel label="Provider" />
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {currentProviders.map((p, idx) => {
                        const id = (p as any).userId;
                        const isPrimary = id === primaryProviderId;
                        const key = "id" in p && typeof (p as any).id === "number" ? (p as any).id : `${id}-${idx}`;
                        return (
                            <li key={`prov-${key}`} className="flex items-center justify-between px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
                                <div className="truncate">{providerNameMap.get(id) ?? id}</div>
                                {mode === "edit" && "id" in p && (p as any).id > 0 ? (
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => handleRemoveParticipant(p as ReservationParticipantDto, "ServiceProvider")}
                                    >
                                        Remove
                                    </button>
                                ) : isPrimary ? (
                                    <span className="text-xs text-slate-400">Primary</span>
                                ) : mode === "create" ? (
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => {
                                            const index = pending.findIndex((x) => x.role === "ServiceProvider" && x.userId === id);
                                            if (index >= 0) removePendingAt(index);
                                        }}
                                    >
                                        Remove
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>

                <DividerLabel label="Attendants" />
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {currentClients.map((c, index) => {
                        const userId = (c as any).userId;
                        const isPrimary = userId === primaryClientId;
                        const key = "id" in c && typeof (c as any).id === "number" ? (c as any).id : `${userId}-${index}`;
                        return (
                            <li key={`cli-${key}`} className="flex items-center justify-between px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
                                <div className="truncate">{clientNameMap.get(userId) || userId}</div>
                                {mode === "edit" && "id" in c && (c as any).id > 0 ? (
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => handleRemoveParticipant(c as ReservationParticipantDto, "Client")}
                                    >
                                        Remove
                                    </button>
                                ) : isPrimary ? (
                                    <span className="text-xs text-slate-400">Primary</span>
                                ) : mode === "create" ? (
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                        onClick={() => {
                                            const idx = pending.findIndex((x) => x.role === "Client" && x.userId === userId);
                                            if (idx >= 0) removePendingAt(idx);
                                        }}
                                    >
                                        Remove
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}

                    {currentGuests.length === 0 && currentClients.length === 0 && (
                        <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No attendants</li>
                    )}

                    {currentGuests.map((g, index) => {
                        if ("id" in g) {
                            const sg = g as ReservationParticipantDto;
                            const label = (sg.guestName ?? "Guest") + (sg.guestPhone ? ` • ${sg.guestPhone}` : "");
                            return (
                                <li key={`guest-saved-${sg.id}-${index}`} className="flex items-center justify-between px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
                                    <div className="truncate">
                                        {label}
                                        <span className="ml-2 text-xs italic text-slate-500 dark:text-slate-400">Guest</span>
                                    </div>
                                    {mode === "edit" && sg.id > 0 ? (
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                            onClick={() => handleRemoveParticipant(sg, "Guest")}
                                        >
                                            Remove
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">Saved</span>
                                    )}
                                </li>
                            );
                        } else {
                            const pg = g as PendingParticipantAdd & { guestName?: string; guestPhone?: string };
                            const label = (pg.guestName ?? "Guest") + (pg.guestPhone ? ` • ${pg.guestPhone}` : "");
                            return (
                                <li key={`guest-pending-${index}`} className="flex items-center justify-between px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
                                    <div className="truncate">
                                        {label}
                                        <span className="ml-2 text-xs italic text-slate-500 dark:text-slate-400">Guest</span>
                                    </div>
                                    {mode === "create" ? (
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                            onClick={() => {
                                                const idx = pending.findIndex(
                                                    (x) => x.role === "Guest" && (x as any).guestName === pg.guestName && (x as any).guestPhone === pg.guestPhone
                                                );
                                                if (idx >= 0) removePendingAt(idx);
                                            }}
                                        >
                                            Remove
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">Saved</span>
                                    )}
                                </li>
                            );
                        }
                    })}
                </ul>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
                Changes you make here are saved immediately.
            </div>
        </div>
    );
};

export default GroupReservationModal;
