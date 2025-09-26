import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthContext";
import ClientSearchInput from "@/components/modals/ClientSearchInput";
import ProviderSearchInput from "@/components/modals/ProviderSearchInput";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";
import { setReservationStatus } from "@/api/reservation-api";
import {
    listParticipants,
    addParticipant,
    removeParticipant,
    type ReservationParticipantDto,
} from "@/api/reservation-participants-api";
import { getClientNameCached } from "@/services/clientNameCache";
import { getProviderLiteById } from "@/api/user-api";
import type { PendingParticipantAdd } from "@/hooks/useEventModal";

/** Lightweight provider option used by the reservation form (prop shape). */
type ProviderLite = { id: string; name: string };
/** Lightweight resource option used by the reservation form. */
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

/** UI tabs for reservations. */
type ReservationTab = "details" | "group";

/** react-select option for numeric IDs (e.g., resource, appointment type). */
type NumberOption = { value: number; label: string };

/** Extracts a robust numeric id for quick-status. */
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

/**
 * Event modal for Reservation / Blocked Time.
 *
 * - Reservation → Details (main form + quick status).
 * - Reservation → Group Reservation
 *   - Edit mode: server-backed participant management (add/remove).
 *   - Create mode: pending participants queued and attached post-create.
 * - Blocked Time view unchanged.
 *
 * Uses ClientSearchInput and ProviderSearchInput (react-select/async).
 * Current Participants shows Provider then Attendants (Clients + Guests).
 * Guests display a small italic "Guest" tag. Cross-role de-dupe enforced.
 */
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
    const { isManager } = useAuth();

    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);
    const reservationIdForQuick = quickStatusReservationId(values);

    // Quick status
    const [statusReason, setStatusReason] = useState("");
    const busyRef = useRef(false);

    // Tabs
    const [resTab, setResTab] = useState<ReservationTab>("details");

    // Participants (edit mode)
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [clientParticipants, setClientParticipants] = useState<ReservationParticipantDto[]>([]);
    const [providerParticipants, setProviderParticipants] = useState<ReservationParticipantDto[]>([]);
    const [guestParticipants, setGuestParticipants] = useState<ReservationParticipantDto[]>([]);
    const [clientNameMap, setClientNameMap] = useState<Map<string, string>>(new Map());
    const [providerNameMap, setProviderNameMap] = useState<Map<string, string>>(new Map());

    // Create-mode pending participants (kept in shared values)
    const pending: PendingParticipantAdd[] = Array.isArray(values?.pendingParticipants)
        ? values.pendingParticipants
        : [];

    // Local selection states for Add buttons (create + edit)
    const [clientToAddId, setClientToAddId] = useState<string | null>(null);
    const [clientPickerKey, setClientPickerKey] = useState(0); // force reset after add

    const [providerToAddId, setProviderToAddId] = useState<string | null>(null);
    const [providerPickerKey, setProviderPickerKey] = useState(0);

    // Unsaved protection for create-mode group tab
    const hasUnsavedGroupChanges =
        open && type === "reservation" && mode === "create" && resTab === "group" && pending.length > 0;

    // Data sources
    const resourceList = useMemo(() => resources ?? [], [resources]);

    // Prime provider name map from incoming providers list
    useEffect(() => {
        if (!providers?.length) return;
        setProviderNameMap(prev => {
            const next = new Map(prev);
            providers.forEach(p => next.set(p.id, p.name || p.id));
            return next;
        });
    }, [providers]);

    const selectedAppointmentType: AppointmentTypeDto | undefined = useMemo(() => {
        const id = values?.appointmentTypeId != null ? Number(values.appointmentTypeId) : undefined;
        return id ? appointmentTypes.find((t) => t.id === id) : undefined;
    }, [values?.appointmentTypeId, appointmentTypes]);

    // Primary selections
    const primaryClientId: string | undefined =
        typeof values?.clientId === "string" && values.clientId ? values.clientId : undefined;
    const primaryProviderId: string | undefined =
        typeof values?.serviceProviderId === "string" && values.serviceProviderId ? values.serviceProviderId : undefined;

    // ---------- Cross-role de-dupe sets ----------
    // Create-mode: include both roles' ids
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

    // Edit-mode: include both roles' ids
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

    // Options for react-select (resource & appointment types)
    const resourceOptionsRS: NumberOption[] = useMemo(
        () => resourceList.map((r) => ({ value: r.id, label: r.name })),
        [resourceList]
    );
    const appointmentTypeOptionsRS: NumberOption[] = useMemo(
        () => appointmentTypes.map((t) => ({ value: t.id, label: t.name })),
        [appointmentTypes]
    );

    const selectedResourceOption: NumberOption | null = useMemo(() => {
        if (values?.resourceId == null) return null;
        const id = Number(values.resourceId);
        const match = resourceOptionsRS.find((o) => o.value === id);
        return match ?? null;
    }, [values?.resourceId, resourceOptionsRS]);

    const selectedAppointmentTypeOption: NumberOption | null = useMemo(() => {
        if (values?.appointmentTypeId == null) return null;
        const id = Number(values.appointmentTypeId);
        const match = appointmentTypeOptionsRS.find((o) => o.value === id);
        return match ?? null;
    }, [values?.appointmentTypeId, appointmentTypeOptionsRS]);

    // Load appointment types when reservation tab is active
    useEffect(() => {
        let cancelled = false;
        if (!open || type !== "reservation") return;
        (async () => {
            try {
                const list = await getAppointmentTypes();
                if (!cancelled) setAppointmentTypes(list);
            } catch { /* no-op */ }
        })();
        return () => { cancelled = true; };
    }, [open, type]);

    // Load participants (edit mode) + resolve display names (clients & providers)
    useEffect(() => {
        let cancelled = false;
        if (!open || type !== "reservation" || mode !== "edit" || !reservationIdForQuick) return;

        (async () => {
            try {
                setLoadingParticipants(true);
                const list = await listParticipants(reservationIdForQuick);
                if (cancelled) return;

                const clients = list.filter(p => p.role === "Client" && !p.isDeleted);
                const provs = list.filter(p => p.role === "ServiceProvider" && !p.isDeleted);
                const guests = list.filter(p => p.role === "Guest" && !p.isDeleted);

                setClientParticipants(clients);
                setProviderParticipants(provs);
                setGuestParticipants(guests);

                // Client names
                const clientIds = new Set<string>();
                if (primaryClientId) clientIds.add(primaryClientId);
                for (const c of clients) if (c.userId) clientIds.add(c.userId);
                if (clientIds.size) {
                    const pairs = await Promise.all(
                        Array.from(clientIds).map(async (id) => [id, await getClientNameCached(id)] as const)
                    );
                    if (!cancelled) {
                        const next = new Map<string, string>();
                        pairs.forEach(([id, name]) => next.set(id, name));
                        setClientNameMap(next);
                    }
                }

                // Provider names
                const provIds = new Set<string>();
                if (primaryProviderId) provIds.add(primaryProviderId);
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
                        setProviderNameMap(prev => {
                            const next = new Map(prev);
                            pairs.forEach(([id, name]) => next.set(id, name));
                            return next;
                        });
                    }
                }
            } catch (err) {
                if (!cancelled) toast.error((err as Error)?.message || "We couldn't load participants.");
            } finally {
                if (!cancelled) setLoadingParticipants(false);
            }
        })();

        return () => { cancelled = true; };
    }, [open, type, mode, reservationIdForQuick, primaryClientId, primaryProviderId]);

    // Create-mode: resolve display names for selected/pending clients & providers
    useEffect(() => {
        let cancelled = false;
        if (!open || type !== "reservation" || mode !== "create") return;

        (async () => {
            try {
                // Clients
                const cids = new Set<string>();
                if (primaryClientId) cids.add(primaryClientId);
                for (const p of pending) if (p.role === "Client" && p.userId) cids.add(p.userId);
                if (cids.size) {
                    const pairs = await Promise.all(
                        Array.from(cids).map(async (id) => [id, await getClientNameCached(id)] as const)
                    );
                    if (!cancelled) {
                        setClientNameMap(prev => {
                            const m = new Map(prev);
                            pairs.forEach(([id, name]) => m.set(id, name));
                            return m;
                        });
                    }
                }

                // Providers
                const pids = new Set<string>();
                if (primaryProviderId) pids.add(primaryProviderId);
                for (const p of pending) if (p.role === "ServiceProvider" && p.userId) pids.add(p.userId);
                if (pids.size) {
                    const pairs = await Promise.all(
                        Array.from(pids).map(async (id) => {
                            try {
                                const dto = await getProviderLiteById(id);
                                return [id, dto?.name || id] as const;
                            } catch {
                                return [id, id] as const;
                            }
                        })
                    );
                    if (!cancelled) {
                        setProviderNameMap(prev => {
                            const m = new Map(prev);
                            pairs.forEach(([id, name]) => m.set(id, name));
                            return m;
                        });
                    }
                }
            } catch { /* no-op */ }
        })();

        return () => { cancelled = true; };
    }, [open, type, mode, primaryClientId, primaryProviderId, pending]);

    // Unsaved changes protection (browser)
    useEffect(() => {
        if (!hasUnsavedGroupChanges) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsavedGroupChanges]);

    // Helpers
    const handleField = (key: string, value: unknown) => {
        setValues((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleAppointmentTypeChange = (option: SingleValue<NumberOption>) => {
        const id = option?.value;
        setValues((prev: any) => {
            const next: any = { ...prev, appointmentTypeId: id };
            const match = id ? appointmentTypes.find((t) => t.id === id) : undefined;
            if (match?.assignedResourceId) next.resourceId = match.assignedResourceId;
            return next;
        });
    };

    // Quick status actions with friendlier toasts
    const runQuickStatus = async (status: "Completed" | "Canceled" | "NoShow") => {
        if (!reservationIdForQuick || busyRef.current) return;
        busyRef.current = true;
        try {
            await setReservationStatus(reservationIdForQuick, status, {
                currentNotes: values?.notes ?? "",
                reason: statusReason.trim() || undefined,
                toastSuccess: false,
            });
            toast.success(
                status === "Completed" ? "Marked as completed." :
                    status === "Canceled" ? "Reservation canceled." :
                        "Marked as no-show."
            );
            onRefreshRequested?.();
            onCancel();
        } catch (err: any) {
            const msg =
                (err?.response?.data?.message as string | undefined) ||
                (err instanceof Error ? err.message : undefined) ||
                "";
            const needsManagerOverride =
                !!msg &&
                (msg.toLowerCase().includes("manager approval") ||
                    msg.toLowerCase().includes("manager override") ||
                    msg.toLowerCase().includes("within"));

            if (isManager && needsManagerOverride) {
                const ok = window.confirm("This may require a manager override. Continue?");
                if (ok) {
                    try {
                        await setReservationStatus(reservationIdForQuick, status, {
                            currentNotes: values?.notes ?? "",
                            reason: statusReason.trim() || undefined,
                            managerOverride: true,
                            toastSuccess: false,
                        });
                        toast.success(
                            status === "Completed" ? "Marked as completed." :
                                status === "Canceled" ? "Reservation canceled." :
                                    "Marked as no-show."
                        );
                        onRefreshRequested?.();
                        onCancel();
                    } catch (err2: any) {
                        const m2 =
                            (err2?.response?.data?.message as string | undefined) ||
                            (err2 instanceof Error ? err2.message : undefined) ||
                            "We couldn't update the status.";
                        toast.error(m2);
                    }
                }
            } else {
                toast.error(msg || "We couldn't update the status.");
            }
        } finally {
            busyRef.current = false;
        }
    };

    // Create-mode pending helpers
    const addPending = (p: PendingParticipantAdd) =>
        setValues((prev: any) => {
            const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants)
                ? [...prev.pendingParticipants]
                : [];
            arr.push(p);
            return { ...prev, pendingParticipants: arr };
        });

    const removePendingAt = (index: number) =>
        setValues((prev: any) => {
            const arr: PendingParticipantAdd[] = Array.isArray(prev.pendingParticipants)
                ? [...prev.pendingParticipants]
                : [];
            arr.splice(index, 1);
            return { ...prev, pendingParticipants: arr };
        });

    // Edit-mode remove (immediate)
    const handleRemoveParticipant = async (p: ReservationParticipantDto, role: "Client" | "ServiceProvider" | "Guest") => {
        if (!reservationIdForQuick) return;
        try {
            if (role === "Client") {
                setClientParticipants((prev) => prev.filter((x) => x.id !== p.id));
            } else if (role === "ServiceProvider") {
                setProviderParticipants((prev) => prev.filter((x) => x.id !== p.id));
            } else {
                setGuestParticipants((prev) => prev.filter((x) => x.id !== p.id));
            }
            await removeParticipant(reservationIdForQuick, p.id);
            toast.success("Removed from this reservation.");
        } catch (err) {
            toast.error((err as Error)?.message || "We couldn't remove that person.");
            try {
                const list = await listParticipants(reservationIdForQuick);
                const clients = list.filter(x => x.role === "Client" && !x.isDeleted);
                const provs = list.filter(x => x.role === "ServiceProvider" && !x.isDeleted);
                const guests = list.filter(x => x.role === "Guest" && !x.isDeleted);
                setClientParticipants(clients);
                setProviderParticipants(provs);
                setGuestParticipants(guests);
            } catch { /* no-op */ }
        }
    };

    // Small UI pieces
    const SegButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; title?: string }> = ({
        active, onClick, children, disabled, title,
    }) => (
        <button
            type="button"
            className={`px-3 py-1 rounded-lg border text-sm ${active ? "bg-gray-100" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );

    const DividerLabel: React.FC<{ label: string }> = ({ label }) => (
        <div className="text-[11px] uppercase tracking-wide text-gray-500 px-3 py-1 border-t mt-2">{label}</div>
    );

    if (!open) return null;

    // Build "Current Participants" view models
    const currentProviders = (() => {
        if (type !== "reservation") return [];
        if (mode === "edit") {
            const list = [...providerParticipants];
            // include primary if not present (rare)
            if (primaryProviderId && !list.some(p => p.userId === primaryProviderId)) {
                list.unshift({
                    id: -1,
                    reservationId: reservationIdForQuick ?? -1,
                    userId: primaryProviderId,
                    role: "ServiceProvider",
                    organizationId: "",
                    isDeleted: false,
                } as ReservationParticipantDto);
            }
            return list;
        } else {
            // create mode: primary + pending providers
            const pend = pending.filter(p => p.role === "ServiceProvider" && p.userId);
            const uniq = new Map<string, PendingParticipantAdd>();
            if (primaryProviderId) uniq.set(primaryProviderId, { role: "ServiceProvider", userId: primaryProviderId });
            for (const p of pend) if (p.userId) uniq.set(p.userId, { role: "ServiceProvider", userId: p.userId });
            return Array.from(uniq.values());
        }
    })();

    const currentClients = (() => {
        if (type !== "reservation") return [];
        if (mode === "edit") {
            const list = [...clientParticipants];
            if (primaryClientId && !list.some(p => p.userId === primaryClientId)) {
                list.unshift({
                    id: -1,
                    reservationId: reservationIdForQuick ?? -1,
                    userId: primaryClientId,
                    role: "Client",
                    organizationId: "",
                    isDeleted: false,
                } as ReservationParticipantDto);
            }
            return list;
        } else {
            const pend = pending.filter(p => p.role === "Client" && p.userId);
            const uniq = new Map<string, PendingParticipantAdd>();
            if (primaryClientId) uniq.set(primaryClientId, { role: "Client", userId: primaryClientId });
            for (const p of pend) if (p.userId) uniq.set(p.userId, { role: "Client", userId: p.userId });
            return Array.from(uniq.values());
        }
    })();

    const currentGuests = (() => {
        if (type !== "reservation") return [];
        return mode === "edit"
            ? [...guestParticipants]
            : pending.filter((p) => p.role === "Guest");
    })();

    // Cancel with unsaved confirmation
    const handleCancel = () => {
        if (hasUnsavedGroupChanges) {
            const leave = window.confirm("You have unsaved changes. Leave without saving?");
            if (!leave) return;
        }
        onCancel();
    };

    // Render
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
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

                        <SegButton
                            active={type === "blockedTime"}
                            onClick={() => setType("blockedTime")}
                        >
                            Blocked Time
                        </SegButton>
                    </div>
                    <div className="text-sm text-gray-500">{mode === "edit" ? "Edit" : "Create"}</div>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    {/* Reservation → Details */}
                    {type === "reservation" && resTab === "details" && (
                        <div className="flex flex-col gap-4">
                            {/* Quick status (edit only) */}
                            {mode === "edit" && reservationIdForQuick && (
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
                                        <div className="font-medium text-sm">Quick status:</div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={() => runQuickStatus("Completed")}
                                            >
                                                Mark Completed
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-rose-600 text-white hover:bg-rose-700"
                                                onClick={() => runQuickStatus("Canceled")}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 text-sm rounded border bg-amber-500 text-white hover:bg-amber-600"
                                                onClick={() => runQuickStatus("NoShow")}
                                            >
                                                No-Show
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <label className="text-xs text-gray-600">Reason (optional)</label>
                                        <input
                                            className="flex-1 border rounded px-2 py-1 text-sm"
                                            placeholder="e.g., client requested, illness, no answer…"
                                            value={statusReason}
                                            onChange={(e) => setStatusReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Main reservation form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Client</label>
                                    <ClientSearchInput
                                        valueId={typeof values.clientId === "string" ? values.clientId : null}
                                        initialLabel={values.clientName ?? clientNameMap.get(values.clientId ?? "") ?? null}
                                        onChange={(c) => handleField("clientId", c?.id ?? "")}
                                        placeholder="Search clients…"
                                        disabled={false}
                                        autoFocus={mode === "create"}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Service Provider</label>
                                    <ProviderSearchInput
                                        valueId={typeof values.serviceProviderId === "string" ? values.serviceProviderId : null}
                                        initialLabel={providerNameMap.get(values.serviceProviderId ?? "") ?? null}
                                        onChange={(p) => handleField("serviceProviderId", p?.id ?? "")}
                                        placeholder="Search providers…"
                                        disabled={false}
                                        autoFocus={false}
                                        // prevent selecting someone who is (or will be) an attendant
                                        excludeIds={mode === "edit" ? editSelectedProviderIds : createSelectedProviderIds}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Appointment Type</label>
                                    <Select
                                        className="text-sm"
                                        classNamePrefix="rs"
                                        options={appointmentTypeOptionsRS}
                                        value={selectedAppointmentTypeOption}
                                        onChange={handleAppointmentTypeChange}
                                        isClearable
                                        placeholder="Select type…"
                                        noOptionsMessage={() => "No appointment types"}
                                    />
                                    {selectedAppointmentType && (
                                        <div className="mt-1 text-xs text-gray-600">
                                            Duration: {selectedAppointmentType.duration}
                                            {typeof selectedAppointmentType.price === "number" ? ` • $${selectedAppointmentType.price}` : ""}
                                            {selectedAppointmentType.assignedResourceName
                                                ? ` • Default resource: ${selectedAppointmentType.assignedResourceName}`
                                                : ""}
                                            {selectedAppointmentType.requiresWaiver ? " • Requires waiver" : ""}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Resource (optional)</label>
                                    <Select
                                        className="text-sm"
                                        classNamePrefix="rs"
                                        options={resourceOptionsRS}
                                        value={selectedResourceOption}
                                        onChange={(option: SingleValue<NumberOption>) =>
                                            handleField("resourceId", option?.value ?? undefined)
                                        }
                                        isClearable
                                        placeholder="None"
                                        noOptionsMessage={() => "No resources"}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Start</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.startDate || ""}
                                            onChange={(e) => handleField("startDate", e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.startTime || ""}
                                            onChange={(e) => handleField("startTime", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">End</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.endDate || ""}
                                            onChange={(e) => handleField("endDate", e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="border rounded-lg px-3 py-2 w-1/2"
                                            value={values.endTime || ""}
                                            onChange={(e) => handleField("endTime", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1">
                                    <label className="text-sm font-medium">Notes</label>
                                    <textarea
                                        className="border rounded-lg px-3 py-2 min-h-[72px]"
                                        value={values.notes || ""}
                                        onChange={(e) => handleField("notes", e.target.value)}
                                        placeholder="optional notes"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reservation → Group Reservation */}
                    {type === "reservation" && resTab === "group" && (
                        <>
                            {mode === "edit" && reservationIdForQuick ? (
                                <div className="flex flex-col gap-6">
                                    {loadingParticipants && (
                                        <div className="text-sm text-gray-500">Loading participants…</div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Clients (edit) */}
                                        <div>
                                            <div className="mb-2 font-medium">Clients</div>

                                            {/* Existing clients list */}
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
                                                            className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                            onClick={() => handleRemoveParticipant(p, "Client")}
                                                            aria-label="Remove client"
                                                            title="Remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add client (select + Add) */}
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
                                                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                                                    onClick={async () => {
                                                        const userId = clientToAddId;
                                                        if (!userId) return;

                                                        if (editSelectedClientIds.has(userId)) {
                                                            toast.info("That person is already on this reservation.");
                                                            return;
                                                        }
                                                        if (!reservationIdForQuick) return;
                                                        try {
                                                            const created = await addParticipant(reservationIdForQuick, { role: "Client", userId });
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
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Providers (edit) */}
                                        <div>
                                            <div className="mb-2 font-medium">Service Providers</div>

                                            {/* Existing providers list */}
                                            <div className="flex flex-col gap-2">
                                                {providerParticipants.map((p) => (
                                                    <div key={p.id} className="flex items-center gap-2">
                                                        <input
                                                            className="flex-1 border rounded-lg px-3 py-2 bg-gray-50"
                                                            value={providerNameMap.get(p.userId) ?? p.userId}
                                                            readOnly
                                                        />
                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                            onClick={() => handleRemoveParticipant(p, "ServiceProvider")}
                                                            aria-label="Remove provider"
                                                            title="Remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add provider (async search + Add) */}
                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="flex-1">
                                                    <ProviderSearchInput
                                                        key={providerPickerKey}
                                                        valueId={null}
                                                        initialLabel={null}
                                                        onChange={(p) => setProviderToAddId(p?.id ?? null)}
                                                        placeholder="Add provider…"
                                                        disabled={false}
                                                        excludeIds={editSelectedProviderIds}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                                                    onClick={async () => {
                                                        const userId = providerToAddId;
                                                        if (!userId) return;

                                                        if (editSelectedProviderIds.has(userId)) {
                                                            toast.info("That person is already on this reservation.");
                                                            return;
                                                        }
                                                        if (!reservationIdForQuick) return;
                                                        try {
                                                            const created = await addParticipant(reservationIdForQuick, { role: "ServiceProvider", userId });
                                                            // Resolve and cache name
                                                            try {
                                                                const dto = await getProviderLiteById(userId);
                                                                setProviderNameMap(prev => {
                                                                    const next = new Map(prev);
                                                                    next.set(userId, dto?.name || userId);
                                                                    return next;
                                                                });
                                                            } catch { /* no-op */ }
                                                            setProviderParticipants((prev) => [...prev, created]);
                                                            setProviderToAddId(null);
                                                            setProviderPickerKey(k => k + 1);
                                                            toast.success("Service provider added to this reservation.");
                                                        } catch (err) {
                                                            toast.error((err as Error)?.message || "We couldn't add that provider.");
                                                        }
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guests (edit) */}
                                    <div className="rounded-lg border p-3">
                                        <div className="mb-2 font-medium">Guests</div>
                                        <GuestAdder
                                            onAdd={async ({ guestName, guestPhone }) => {
                                                if (!reservationIdForQuick) return;
                                                try {
                                                    await addParticipant(reservationIdForQuick, { role: "Guest", guestName, guestPhone });
                                                    toast.success("Guest added to this reservation.");
                                                } catch (err) {
                                                    toast.error((err as Error)?.message || "We couldn't add that guest.");
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Current Participants (provider, attendants) */}
                                    <div className="rounded-lg border">
                                        <div className="px-3 py-2 text-sm font-medium bg-gray-50">Current Participants</div>

                                        <DividerLabel label="Provider" />
                                        <ul className="divide-y">
                                            {currentProviders.map((p, idx) => (
                                                <li key={`prov-${("id" in p ? p.id : (p as any).userId) ?? idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                    <div className="truncate">
                                                        {providerNameMap.get(("userId" in p ? p.userId! : (p as any).userId) ?? "") ||
                                                            ("userId" in p ? p.userId : (p as any).userId)}
                                                    </div>
                                                    {"id" in p && p.id > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                            onClick={() => handleRemoveParticipant(p as ReservationParticipantDto, "ServiceProvider")}
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Primary</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>

                                        <DividerLabel label="Attendants" />
                                        <ul className="divide-y">
                                            {currentClients.map((c, index) => (
                                                <li key={`cli-${("id" in c ? c.id : (c as any).userId) ?? index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                    <div className="truncate">
                                                        {clientNameMap.get(("userId" in c ? c.userId! : (c as any).userId) ?? "") ||
                                                            ("userId" in c ? c.userId : (c as any).userId)}
                                                    </div>
                                                    {"id" in c && c.id > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                            onClick={() => handleRemoveParticipant(c as ReservationParticipantDto, "Client")}
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Primary</span>
                                                    )}
                                                </li>
                                            ))}

                                            {currentGuests.length === 0 && currentClients.length === 0 && (
                                                <li className="px-3 py-2 text-sm text-gray-400">No attendants</li>
                                            )}
                                            {currentGuests.map((g, index) => {
                                                if ("id" in g) {
                                                    const sg = g as ReservationParticipantDto;
                                                    const label = sg.guestName || "Guest";
                                                    const phone = sg.guestPhone ? ` • ${sg.guestPhone}` : "";
                                                    return (
                                                        <li key={`guest-${sg.id}-${index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                            <div className="truncate">
                                                                {label}{phone}
                                                                <span className="ml-2 text-xs italic text-gray-500">Guest</span>
                                                            </div>
                                                            {sg.id > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                                    onClick={() => handleRemoveParticipant(sg, "Guest")}
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">Primary</span>
                                                            )}
                                                        </li>
                                                    );
                                                } else {
                                                    const pg = g as PendingParticipantAdd & { guestName?: string; guestPhone?: string };
                                                    const label = (pg.guestName ?? "Guest") + (pg.guestPhone ? ` • ${pg.guestPhone}` : "");
                                                    return (
                                                        <li key={`guest-pending-${index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                            <div className="truncate">
                                                                {label}
                                                                <span className="ml-2 text-xs italic text-gray-500">Guest</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">Pending</span>
                                                        </li>
                                                    );
                                                }
                                            })}
                                        </ul>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        Changes you make here are saved immediately.
                                    </div>
                                </div>
                            ) : (
                                // Create mode
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Clients (create) */}
                                        <div>
                                            <div className="mb-2 font-medium">Clients</div>
                                            <div className="flex items-center gap-2">
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
                                                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                                                    onClick={() => {
                                                        const userId = clientToAddId;
                                                        if (!userId) return;

                                                        if (createSelectedClientIds.has(userId)) {
                                                            toast.info("That person is already selected.");
                                                            return;
                                                        }
                                                        addPending({ role: "Client", userId });
                                                        setClientToAddId(null);
                                                        setClientPickerKey((k) => k + 1);
                                                        toast.success("Client added.");
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Providers (create) */}
                                        <div>
                                            <div className="mb-2 font-medium">Service Providers</div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <ProviderSearchInput
                                                        key={providerPickerKey}
                                                        valueId={null}
                                                        initialLabel={null}
                                                        onChange={(p) => setProviderToAddId(p?.id ?? null)}
                                                        placeholder="Add provider…"
                                                        disabled={false}
                                                        excludeIds={createSelectedProviderIds}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                                                    onClick={() => {
                                                        const userId = providerToAddId;
                                                        if (!userId) return;

                                                        if (createSelectedProviderIds.has(userId)) {
                                                            toast.info("That person is already selected.");
                                                            return;
                                                        }
                                                        addPending({ role: "ServiceProvider", userId });
                                                        setProviderToAddId(null);
                                                        setProviderPickerKey(k => k + 1);
                                                        toast.success("Service provider added.");
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guests (create) */}
                                    <div className="rounded-lg border p-3">
                                        <div className="mb-2 font-medium">Guests</div>
                                        <GuestAdder
                                            onAdd={({ guestName, guestPhone }) => {
                                                addPending({ role: "Guest", guestName, guestPhone });
                                                toast.success("Guest added.");
                                            }}
                                        />
                                    </div>

                                    {/* Current Participants */}
                                    <div className="rounded-lg border">
                                        <div className="px-3 py-2 text-sm font-medium bg-gray-50">Current Participants</div>

                                        <DividerLabel label="Provider" />
                                        <ul className="divide-y">
                                            {currentProviders.map((p, idx) => {
                                                const isPrimary = "userId" in p && p.userId === primaryProviderId;
                                                const id = "userId" in p ? p.userId! : (p as any).userId;
                                                return (
                                                    <li key={`cprov-${("id" in p ? p.id : id) ?? idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                        <div className="truncate">{providerNameMap.get(id) ?? id}</div>
                                                        {isPrimary ? (
                                                            <span className="text-xs text-gray-400">Primary</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                                onClick={() => {
                                                                    const index = pending.findIndex(
                                                                        x => x.role === "ServiceProvider" && x.userId === id
                                                                    );
                                                                    if (index >= 0) removePendingAt(index);
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        <DividerLabel label="Attendants" />
                                        <ul className="divide-y">
                                            {currentClients.map((c, index) => {
                                                const userId = "userId" in c ? c.userId! : (c as any).userId;
                                                const isPrimary = userId === primaryClientId;
                                                return (
                                                    <li key={`ccli-${("id" in c ? c.id : userId) ?? index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                        <div className="truncate">
                                                            {clientNameMap.get(userId) || userId}
                                                        </div>
                                                        {isPrimary ? (
                                                            <span className="text-xs text-gray-400">Primary</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                                onClick={() => {
                                                                    const index = pending.findIndex(
                                                                        x => x.role === "Client" && x.userId === userId
                                                                    );
                                                                    if (index >= 0) removePendingAt(index);
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </li>
                                                );
                                            })}

                                            {currentGuests.length === 0 && currentClients.length === 0 && (
                                                <li className="px-3 py-2 text-sm text-gray-400">No attendants</li>
                                            )}
                                            {currentGuests.map((g, index) => {
                                                if ("id" in g) {
                                                    const sg = g as ReservationParticipantDto;
                                                    const label = (sg.guestName ?? "Guest") + (sg.guestPhone ? ` • ${sg.guestPhone}` : "");
                                                    return (
                                                        <li key={`cguest-saved-${sg.id}-${index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                            <div className="truncate">
                                                                {label}
                                                                <span className="ml-2 text-xs italic text-gray-500">Guest</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">Saved</span>
                                                        </li>
                                                    );
                                                } else {
                                                    const pg = g as PendingParticipantAdd & { guestName?: string; guestPhone?: string };
                                                    const label = (pg.guestName ?? "Guest") + (pg.guestPhone ? ` • ${pg.guestPhone}` : "");
                                                    return (
                                                        <li key={`cguest-${index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                                            <div className="truncate">
                                                                {label}
                                                                <span className="ml-2 text-xs italic text-gray-500">Guest</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                                                                onClick={() => {
                                                                    const idx = pending.findIndex(
                                                                        (x) =>
                                                                            x.role === "Guest" &&
                                                                            (x as any).guestName === pg.guestName &&
                                                                            (x as any).guestPhone === pg.guestPhone
                                                                    );
                                                                    if (idx >= 0) removePendingAt(idx);
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </li>
                                                    );
                                                }
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Blocked Time */}
                    {type === "blockedTime" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Resource (optional)</label>
                                <Select
                                    className="text-sm"
                                    classNamePrefix="rs"
                                    options={resourceOptionsRS}
                                    value={selectedResourceOption}
                                    onChange={(option: SingleValue<NumberOption>) =>
                                        handleField("resourceId", option?.value ?? undefined)
                                    }
                                    isClearable
                                    placeholder="None"
                                    noOptionsMessage={() => "No resources"}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Reason</label>
                                <input
                                    className="border rounded-lg px-3 py-2"
                                    value={values.reason || ""}
                                    onChange={(e) => handleField("reason", e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Start</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.startDate || ""}
                                        onChange={(e) => handleField("startDate", e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.startTime || ""}
                                        onChange={(e) => handleField("startTime", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">End</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.endDate || ""}
                                        onChange={(e) => handleField("endDate", e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="border rounded-lg px-3 py-2 w-1/2"
                                        value={values.endTime || ""}
                                        onChange={(e) => handleField("endTime", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                    <div className="text-xs text-gray-500">
                        {type === "reservation"
                            ? resTab === "group"
                                ? "Group Reservation"
                                : "Reservation"
                            : "Blocked time"}
                    </div>
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button className="px-3 py-2 rounded-lg border text-red-700" onClick={onDelete}>
                                Delete
                            </button>
                        )}
                        <button className="px-3 py-2 rounded-lg border" onClick={handleCancel}>
                            Cancel
                        </button>
                        {onSubmit && (
                            <button
                                className="px-3 py-2 rounded-lg border bg-gray-900 text-white"
                                onClick={onSubmit}
                            >
                                Save
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Inline component to add a single guest (name/phone) with consistent styling. */
const GuestAdder: React.FC<{ onAdd: (guest: { guestName: string; guestPhone?: string }) => void }> = ({ onAdd }) => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    return (
        <div className="flex items-center gap-2">
            <input
                className="border rounded px-2 py-2 text-sm flex-1"
                placeholder="Guest name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                className="border rounded px-2 py-2 text-sm w-44"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />
            <button
                type="button"
                className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
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

export default EventModal;
