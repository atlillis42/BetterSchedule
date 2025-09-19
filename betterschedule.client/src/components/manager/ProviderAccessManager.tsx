import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@auth/AuthContext";

import { getProvidersLite, type ProviderLite } from "@/api/user-api";
import { getResources } from "@/api/calendar-resource-api";
import { getAppointmentTypes, type AppointmentTypeDto } from "@/api/appointmenttype-api";

import {
    listResourceIdsByProvider,
    assignProviderResource,
    unassignProviderResource,
} from "@/api/provider-resource-access-api";

import {
    listAppointmentTypeIdsByProvider,
    assignProviderAppointmentType,
    unassignProviderAppointmentType,
} from "@/api/provider-appointment-type-access-api";

import {
    listResourceIdsByAppointmentType,
    assignAppointmentTypeResource,
    unassignAppointmentTypeResource,
} from "@/api/appointment-type-resource-access-api";

/** Compact resource shape for checklists. */
type ResourceLite = { id: number; name: string };
/** Tabs available in the access manager. */
type TabKey = "provider-resources" | "provider-types" | "type-resources";

/**
 * Section container with title and optional actions.
 */
function SectionShell({
    title,
    children,
    actions,
}: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-medium">{title}</h2>
                <div className="flex gap-2">{actions}</div>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function Loading({ text = "Loading…" }: { text?: string }) {
    return <div className="p-2 text-sm text-gray-600">{text}</div>;
}

function ErrorText({ text = "Something went wrong." }: { text?: string }) {
    return <div className="p-2 text-sm text-red-600">{text}</div>;
}

/* ------------------------------------------------------------------ */
/* Provider ↔ Resources                                               */
/* ------------------------------------------------------------------ */

/**
 * Grants/removes resource access for a selected provider.
 * The checkbox updates immediately; on failure it’s reverted and an error is shown.
 */
function ProviderResourceAccessPanel({
    providers,
    resources,
}: {
    providers: ProviderLite[];
    resources: ResourceLite[];
}) {
    const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? "");
    const [assigned, setAssigned] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const selectedProvider = useMemo(
        () => providers.find((p) => p.id === providerId),
        [providers, providerId]
    );

    const refresh = async () => {
        if (!providerId) return;
        setLoading(true);
        setErr(null);
        try {
            const ids = await listResourceIdsByProvider(providerId);
            setAssigned(new Set(ids));
        } catch {
            setErr("Failed to load assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!providerId) return;
        // best effort refresh; ignore lint on missing deps (stable endpoints)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        refresh();
    }, [providerId]);

    const onToggle = async (resourceId: number, next: boolean) => {
        setSavingId(resourceId);
        setErr(null);

        // update UI first
        setAssigned((prev) => {
            const copy = new Set(prev);
            if (next) copy.add(resourceId);
            else copy.delete(resourceId);
            return copy;
        });

        try {
            if (next) {
                await assignProviderResource({ userId: providerId, resourceId });
                toast.success("Access granted.");
            } else {
                await unassignProviderResource({ userId: providerId, resourceId });
                toast.success("Access removed.");
            }
        } catch {
            // roll back on failure
            setAssigned((prev) => {
                const copy = new Set(prev);
                if (next) copy.delete(resourceId);
                else copy.add(resourceId);
                return copy;
            });
            toast.error("Update failed.");
        } finally {
            setSavingId(null);
        }
    };

    // Build the right column content using statements (not short-circuit/ternary in JSX)
    let rightColumnContent: React.ReactNode;
    if (loading) {
        rightColumnContent = <Loading />;
    } else if (err) {
        rightColumnContent = <ErrorText text={err} />;
    } else {
        rightColumnContent = (
            <div className="grid md:grid-cols-2 gap-2">
                {resources.map((r) => {
                    const checked = assigned.has(r.id);
                    const disabled = savingId === r.id;
                    const checkedClass = checked ? "bg-green-50 border-green-200" : "";
                    return (
                        <label
                            key={r.id}
                            className={`flex items-center gap-2 border rounded px-3 py-2 ${checkedClass}`}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => onToggle(r.id, e.target.checked)}
                            />
                            <span className="text-sm">{r.name}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    let selectedInfo: React.ReactNode = null;
    if (selectedProvider) {
        selectedInfo = (
            <div className="mt-3 text-xs text-gray-500">
                Managing access for:{" "}
                <span className="font-medium">{selectedProvider.name || selectedProvider.id}</span>
            </div>
        );
    }

    return (
        <SectionShell
            title="Provider ↔ Resources"
            actions={
                <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={refresh}
                    disabled={!providerId || loading}
                    title="Refresh assignments"
                >
                    Refresh
                </button>
            }
        >
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="text-sm block mb-1">Provider</label>
                    <select
                        className="w-full border rounded px-2 py-2"
                        value={providerId}
                        onChange={(e) => setProviderId(e.target.value)}
                    >
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-500">
                        Grant or remove access to <b>resources</b> for the selected provider.
                    </div>
                </div>

                <div className="md:col-span-2">{rightColumnContent}</div>
            </div>

            {selectedInfo}
        </SectionShell>
    );
}

/* ------------------------------------------------------------------ */
/* Provider ↔ Appointment Types                                       */
/* ------------------------------------------------------------------ */

/**
 * Grants/removes appointment type access for a selected provider.
 * The checkbox updates immediately; on failure it’s reverted and an error is shown.
 */
function ProviderAppointmentTypeAccessPanel({
    providers,
    appointmentTypes,
}: {
    providers: UserLite[];
    appointmentTypes: AppointmentTypeDto[];
}) {
    const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? "");
    const [assigned, setAssigned] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const refresh = async () => {
        if (!providerId) return;
        setLoading(true);
        setErr(null);
        try {
            const ids = await listAppointmentTypeIdsByProvider(providerId);
            setAssigned(new Set(ids));
        } catch {
            setErr("Failed to load assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!providerId) return;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        refresh();
    }, [providerId]);

    const onToggle = async (appointmentTypeId: number, next: boolean) => {
        setSavingId(appointmentTypeId);
        setErr(null);

        // update UI first
        setAssigned((prev) => {
            const copy = new Set(prev);
            if (next) copy.add(appointmentTypeId);
            else copy.delete(appointmentTypeId);
            return copy;
        });

        try {
            if (next) {
                await assignProviderAppointmentType({ userId: providerId, appointmentTypeId });
                toast.success("Access granted.");
            } else {
                await unassignProviderAppointmentType({ userId: providerId, appointmentTypeId });
                toast.success("Access removed.");
            }
        } catch {
            // roll back on failure
            setAssigned((prev) => {
                const copy = new Set(prev);
                if (next) copy.delete(appointmentTypeId);
                else copy.add(appointmentTypeId);
                return copy;
            });
            toast.error("Update failed.");
        } finally {
            setSavingId(null);
        }
    };

    let rightColumnContent: React.ReactNode;
    if (loading) {
        rightColumnContent = <Loading />;
    } else if (err) {
        rightColumnContent = <ErrorText text={err} />;
    } else {
        rightColumnContent = (
            <div className="grid md:grid-cols-2 gap-2">
                {appointmentTypes.map((t) => {
                    const checked = assigned.has(t.id);
                    const disabled = savingId === t.id;
                    const checkedClass = checked ? "bg-blue-50 border-blue-200" : "";
                    return (
                        <label
                            key={t.id}
                            className={`flex items-center gap-2 border rounded px-3 py-2 ${checkedClass}`}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => onToggle(t.id, e.target.checked)}
                            />
                            <span className="text-sm">{t.name}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    return (
        <SectionShell
            title="Provider ↔ Appointment Types"
            actions={
                <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={refresh}
                    disabled={!providerId || loading}
                    title="Refresh assignments"
                >
                    Refresh
                </button>
            }
        >
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="text-sm block mb-1">Provider</label>
                    <select
                        className="w-full border rounded px-2 py-2"
                        value={providerId}
                        onChange={(e) => setProviderId(e.target.value)}
                    >
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name || p.id}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-500">
                        Grant or remove access to <b>appointment types</b> for the selected provider.
                    </div>
                </div>

                <div className="md:col-span-2">{rightColumnContent}</div>
            </div>
        </SectionShell>
    );
}

/* ------------------------------------------------------------------ */
/* Appointment Type ↔ Resources                                       */
/* ------------------------------------------------------------------ */

/**
 * Limits which resources can be used with a given appointment type.
 * The checkbox updates immediately; on failure it’s reverted and an error is shown.
 */
function AppointmentTypeResourceAccessPanel({
    appointmentTypes,
    resources,
}: {
    appointmentTypes: AppointmentTypeDto[];
    resources: ResourceLite[];
}) {
    const [appointmentTypeId, setAppointmentTypeId] = useState<number>(appointmentTypes[0]?.id ?? 0);
    const [assigned, setAssigned] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const refresh = async () => {
        if (!appointmentTypeId) return;
        setLoading(true);
        setErr(null);
        try {
            const ids = await listResourceIdsByAppointmentType(appointmentTypeId);
            setAssigned(new Set(ids));
        } catch {
            setErr("Failed to load assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!appointmentTypeId) return;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        refresh();
    }, [appointmentTypeId]);

    const onToggle = async (resourceId: number, next: boolean) => {
        setSavingId(resourceId);
        setErr(null);

        // update UI first
        setAssigned((prev) => {
            const copy = new Set(prev);
            if (next) copy.add(resourceId);
            else copy.delete(resourceId);
            return copy;
        });

        try {
            if (next) {
                await assignAppointmentTypeResource({ appointmentTypeId, resourceId });
                toast.success("Access granted.");
            } else {
                await unassignAppointmentTypeResource({ appointmentTypeId, resourceId });
                toast.success("Access removed.");
            }
        } catch {
            // roll back on failure
            setAssigned((prev) => {
                const copy = new Set(prev);
                if (next) copy.delete(resourceId);
                else copy.add(resourceId);
                return copy;
            });
            toast.error("Update failed.");
        } finally {
            setSavingId(null);
        }
    };

    let rightColumnContent: React.ReactNode;
    if (loading) {
        rightColumnContent = <Loading />;
    } else if (err) {
        rightColumnContent = <ErrorText text={err} />;
    } else {
        rightColumnContent = (
            <div className="grid md:grid-cols-2 gap-2">
                {resources.map((r) => {
                    const checked = assigned.has(r.id);
                    const disabled = savingId === r.id;
                    const checkedClass = checked ? "bg-purple-50 border-purple-200" : "";
                    return (
                        <label
                            key={r.id}
                            className={`flex items-center gap-2 border rounded px-3 py-2 ${checkedClass}`}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => onToggle(r.id, e.target.checked)}
                            />
                            <span className="text-sm">{r.name}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    return (
        <SectionShell
            title="Appointment Type ↔ Resources"
            actions={
                <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={refresh}
                    disabled={!appointmentTypeId || loading}
                    title="Refresh assignments"
                >
                    Refresh
                </button>
            }
        >
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="text-sm block mb-1">Appointment Type</label>
                    <select
                        className="w-full border rounded px-2 py-2"
                        value={appointmentTypeId || ""}
                        onChange={(e) => setAppointmentTypeId(Number(e.target.value))}
                    >
                        {appointmentTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-500">
                        Limit which <b>resources</b> can be used with an appointment type.
                    </div>
                </div>

                <div className="md:col-span-2">{rightColumnContent}</div>
            </div>
        </SectionShell>
    );
}

/* ------------------------------------------------------------------ */
/* Top-level page                                                     */
/* ------------------------------------------------------------------ */

/**
 * Manager page for controlling provider ↔ resource and provider ↔ appointment-type mappings,
 * and optionally restricting resources per appointment type.
 *
 * Enforcement is controlled in Organization Settings via:
 * `LimitProvidersToAssignedResources`, `LimitProvidersToAssignedAppointmentTypes`,
 * and `EnforceAppointmentTypeResourceRules`.
 */
export default function ProviderAccessManager() {
    const { isManager } = useAuth();

    const [activeTab, setActiveTab] = useState<TabKey>("provider-resources");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [providers, setProviders] = useState<UserLite[]>([]);
    const [resources, setResources] = useState<ResourceLite[]>([]);
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDto[]>([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const [prov, res, types] = await Promise.all([
                    getProvidersLite(),
                    getResources(),
                    getAppointmentTypes(),
                ]);
                setProviders(prov);
                setResources(res);
                setAppointmentTypes(types);
            } catch {
                setErr("Failed to load reference data (providers/resources/types).");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (!isManager) {
        return <div className="p-6 text-sm text-gray-700">You don’t have permission to view this page.</div>;
    }

    if (loading) {
        return (
            <div className="p-6">
                <Loading text="Loading access manager…" />
            </div>
        );
    }

    if (err) {
        return (
            <div className="p-6">
                <ErrorText text={err} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Provider Access Management</h1>
                    <p className="text-sm text-gray-600">
                        Control which <b>resources</b> and <b>appointment types</b> providers can use, and optionally restrict
                        which resources are allowed for a given appointment type.
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    className={`px-3 py-2 text-sm ${activeTab === "provider-resources" ? "border-b-2 border-black font-medium" : "text-gray-600"
                        }`}
                    onClick={() => setActiveTab("provider-resources")}
                >
                    Provider ↔ Resources
                </button>
                <button
                    className={`px-3 py-2 text-sm ${activeTab === "provider-types" ? "border-b-2 border-black font-medium" : "text-gray-600"
                        }`}
                    onClick={() => setActiveTab("provider-types")}
                >
                    Provider ↔ Appointment Types
                </button>
                <button
                    className={`px-3 py-2 text-sm ${activeTab === "type-resources" ? "border-b-2 border-black font-medium" : "text-gray-600"
                        }`}
                    onClick={() => setActiveTab("type-resources")}
                >
                    Appointment Type ↔ Resources
                </button>
            </div>

            {/* Panels */}
            <div className="space-y-6">
                {activeTab === "provider-resources" ? (
                    <ProviderResourceAccessPanel providers={providers} resources={resources} />
                ) : null}

                {activeTab === "provider-types" ? (
                    <ProviderAppointmentTypeAccessPanel providers={providers} appointmentTypes={appointmentTypes} />
                ) : null}

                {activeTab === "type-resources" ? (
                    <AppointmentTypeResourceAccessPanel appointmentTypes={appointmentTypes} resources={resources} />
                ) : null}
            </div>

            <footer className="text-xs text-gray-500">
                Tip: To <b>enforce</b> these mappings, toggle the relevant switches in Organization Settings:
                <span className="ml-1 font-medium">LimitProvidersToAssignedResources</span>,{" "}
                <span className="font-medium">LimitProvidersToAssignedAppointmentTypes</span>, and{" "}
                <span className="font-medium">EnforceAppointmentTypeResourceRules</span>.
            </footer>
        </div>
    );
}
