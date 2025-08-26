import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
    getOrgSettings,
    updateOrgSettings,
    minutesToTimeSpan,
    hoursToTimeSpan,
    timeSpanToMinutes,
    timeSpanToHours,
    normalizeHHmmOrHHmmss,
    type DefaultCalendarView,
    type CalendarShadingMode,
    type AvailabilityEnforcement,
    type ProviderCancelPolicy, 
} from "@/api/org-settings-api";
import { useAuth } from "@auth/AuthContext";
import ProviderAccessManager from "@/components/admin/ProviderAccessManager";

/** Local form model (UI-friendly fields) */
type Form = {
    // booking windows as numbers for easy editing
    minLeadMinutes: number;
    cancelWindowHours: number;

    // provider cancel policy
    providerCancelPolicy: ProviderCancelPolicy;

    // calendar display
    showWeekends: boolean;
    startOfWeek: number;
    businessHoursStartLocal: string; // "HH:mm:ss" or "HH:mm"
    businessHoursEndLocal: string;   // "HH:mm:ss" or "HH:mm"
    defaultView: DefaultCalendarView;

    // availability
    shadingMode: CalendarShadingMode;
    availabilityEnforcement: AvailabilityEnforcement;
    requireConfirmOnOverrides: boolean;
    availabilityPublic: boolean;
    providersCanEditOwnAvailability: boolean;

    // tz/locale
    timeZoneId: string;
    locale: string;

    // notifications
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean;
    reminderHoursBefore: number | null;
};

type TabKey = "general" | "access";

const hhmm = (ts: string) => ts.slice(0, 5); // "HH:mm:ss" -> "HH:mm"

export default function OrgSettingsManager() {
    const { isManager } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>("general");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [f, setF] = useState<Form | null>(null);

    // Load → map server DTO to local Form
    useEffect(() => {
        (async () => {
            try {
                const s = await getOrgSettings();
                setF({
                    minLeadMinutes: timeSpanToMinutes(s.bookingLeadTime),
                    cancelWindowHours: timeSpanToHours(s.cancellationWindow),

                    providerCancelPolicy: s.providerCancelPolicy ?? "AnyTime",

                    showWeekends: s.showWeekends,
                    startOfWeek: s.startOfWeek,
                    businessHoursStartLocal: s.businessHoursStartLocal,
                    businessHoursEndLocal: s.businessHoursEndLocal,
                    defaultView: s.defaultView,
                    shadingMode: s.shadingMode,
                    availabilityEnforcement: s.availabilityEnforcement,
                    requireConfirmOnOverrides: s.requireConfirmOnOverrides,
                    availabilityPublic: s.availabilityPublic,
                    providersCanEditOwnAvailability: s.providersCanEditOwnAvailability,
                    timeZoneId: s.timeZoneId,
                    locale: s.locale,
                    emailEnabled: s.emailEnabled,
                    smsEnabled: s.smsEnabled,
                    sendBookingConfirmation: s.sendBookingConfirmation,
                    reminderHoursBefore: s.reminderHoursBefore ?? null,
                });
            } catch {
                toast.error("Failed to load organization settings.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const canEdit = isManager;

    const businessHoursInvalid = useMemo(() => {
        if (!f) return false;
        const start = normalizeHHmmOrHHmmss(f.businessHoursStartLocal);
        const end = normalizeHHmmOrHHmmss(f.businessHoursEndLocal);
        // simple lexicographic compare works for HH:mm:ss
        return end <= start;
    }, [f]);

    const save = async () => {
        if (!f) return;
        if (businessHoursInvalid) {
            toast.error("Business hours end must be after start.");
            return;
        }

        setSaving(true);
        try {
            await updateOrgSettings({
                // booking windows (convert numeric -> TimeSpan strings)
                bookingLeadTime: minutesToTimeSpan(f.minLeadMinutes),
                cancellationWindow: hoursToTimeSpan(f.cancelWindowHours),

                // provider cancel policy
                providerCancelPolicy: f.providerCancelPolicy,

                // calendar display
                showWeekends: f.showWeekends,
                startOfWeek: f.startOfWeek,
                businessHoursStartLocal: normalizeHHmmOrHHmmss(f.businessHoursStartLocal),
                businessHoursEndLocal: normalizeHHmmOrHHmmss(f.businessHoursEndLocal),
                defaultView: f.defaultView,

                // availability
                shadingMode: f.shadingMode,
                availabilityEnforcement: f.availabilityEnforcement,
                requireConfirmOnOverrides: f.requireConfirmOnOverrides,
                availabilityPublic: f.availabilityPublic,
                providersCanEditOwnAvailability: f.providersCanEditOwnAvailability,

                // tz/locale
                timeZoneId: f.timeZoneId,
                locale: f.locale,

                // notifications
                emailEnabled: f.emailEnabled,
                smsEnabled: f.smsEnabled,
                sendBookingConfirmation: f.sendBookingConfirmation,
                reminderHoursBefore: f.reminderHoursBefore,
            });
            toast.success("Settings saved.");
        } catch {
            toast.error("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-sm text-gray-600">Loading settings…</div>;
    if (!f) return <div className="p-4 text-sm text-red-600">Unable to load settings.</div>;

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Organization Settings</h1>

                {/* Tab switcher */}
                <div className="flex gap-2 border rounded-lg bg-white overflow-hidden">
                    <button
                        className={`px-3 py-2 text-sm ${activeTab === "general" ? "bg-gray-900 text-white" : "text-gray-700"}`}
                        onClick={() => setActiveTab("general")}
                    >
                        General
                    </button>
                    <button
                        className={`px-3 py-2 text-sm ${activeTab === "access" ? "bg-gray-900 text-white" : "text-gray-700"}`}
                        onClick={() => setActiveTab("access")}
                    >
                        Access
                    </button>
                </div>
            </header>

            {activeTab === "general" && (
                <>
                    {/* Booking guardrails */}
                    <section className="rounded-xl border p-4 space-y-3 bg-white">
                        <div className="font-medium">Booking Guardrails</div>
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <label className="flex flex-col">
                                <span>Min lead time (minutes)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="border rounded px-2 py-1"
                                    value={f.minLeadMinutes}
                                    onChange={(e) => setF({ ...f, minLeadMinutes: Math.max(0, Number(e.target.value || 0)) })}
                                    disabled={!canEdit}
                                />
                            </label>
                            <label className="flex flex-col">
                                <span>Cancel window (hours)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="border rounded px-2 py-1"
                                    value={f.cancelWindowHours}
                                    onChange={(e) => setF({ ...f, cancelWindowHours: Math.max(0, Number(e.target.value || 0)) })}
                                    disabled={!canEdit}
                                />
                            </label>

                            {/* Provider cancel policy */}
                            <label className="flex flex-col">
                                <span>Provider cancel policy</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={f.providerCancelPolicy}
                                    onChange={(e) => setF({ ...f, providerCancelPolicy: e.target.value as ProviderCancelPolicy })}
                                    disabled={!canEdit}
                                >
                                    <option value="AnyTime">AnyTime (default; friendliest)</option>
                                    <option value="RespectWindow">RespectWindow (no cancel inside window)</option>
                                    <option value="None">None (managers only)</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    {/* Calendar display */}
                    <section className="rounded-xl border p-4 space-y-3 bg-white">
                        <div className="font-medium">Calendar Display</div>
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.showWeekends}
                                    onChange={(e) => setF({ ...f, showWeekends: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Show weekends</span>
                            </label>

                            <label className="flex flex-col">
                                <span>Start of week (0=Sun)</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={6}
                                    className="border rounded px-2 py-1"
                                    value={f.startOfWeek}
                                    onChange={(e) => setF({ ...f, startOfWeek: Math.min(6, Math.max(0, Number(e.target.value || 0))) })}
                                    disabled={!canEdit}
                                />
                            </label>

                            <label className="flex flex-col">
                                <span>Default view</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={f.defaultView}
                                    onChange={(e) => setF({ ...f, defaultView: e.target.value as DefaultCalendarView })}
                                    disabled={!canEdit}
                                >
                                    <option>Day</option>
                                    <option>Week</option>
                                    <option>Month</option>
                                    <option>Resources</option>
                                </select>
                            </label>

                            <label className="flex flex-col">
                                <span>Business start (local)</span>
                                <input
                                    type="time"
                                    className="border rounded px-2 py-1"
                                    value={hhmm(f.businessHoursStartLocal)}
                                    onChange={(e) => setF({ ...f, businessHoursStartLocal: `${e.target.value}:00` })}
                                    disabled={!canEdit}
                                />
                            </label>

                            <label className="flex flex-col">
                                <span>Business end (local)</span>
                                <input
                                    type="time"
                                    className={`border rounded px-2 py-1 ${businessHoursInvalid ? "border-red-500" : ""}`}
                                    value={hhmm(f.businessHoursEndLocal)}
                                    onChange={(e) => setF({ ...f, businessHoursEndLocal: `${e.target.value}:00` })}
                                    disabled={!canEdit}
                                />
                                {businessHoursInvalid && <span className="text-xs text-red-600 mt-1">End must be after start.</span>}
                            </label>
                        </div>
                    </section>

                    {/* Availability */}
                    <section className="rounded-xl border p-4 space-y-3 bg-white">
                        <div className="font-medium">Availability</div>
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <label className="flex flex-col">
                                <span>Shading mode</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={f.shadingMode}
                                    onChange={(e) => setF({ ...f, shadingMode: e.target.value as any })}
                                    disabled={!canEdit}
                                >
                                    <option value="None">None</option>
                                    <option value="OrgBusinessHours">OrgBusinessHours</option>
                                    <option value="ProviderAvailability">ProviderAvailability</option>
                                </select>
                            </label>

                            <label className="flex flex-col">
                                <span>Enforcement</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={f.availabilityEnforcement}
                                    onChange={(e) => setF({ ...f, availabilityEnforcement: e.target.value as any })}
                                    disabled={!canEdit}
                                >
                                    <option>None</option>
                                    <option>Warn</option>
                                    <option>BlockProvidersWarnManagers</option>
                                    <option>BlockAllRequireOverride</option>
                                </select>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.requireConfirmOnOverrides}
                                    onChange={(e) => setF({ ...f, requireConfirmOnOverrides: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Require confirm on overrides</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.availabilityPublic}
                                    onChange={(e) => setF({ ...f, availabilityPublic: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Availability visible to all users</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.providersCanEditOwnAvailability}
                                    onChange={(e) => setF({ ...f, providersCanEditOwnAvailability: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Providers can edit their own availability</span>
                            </label>
                        </div>
                    </section>

                    {/* Locale / Notifications */}
                    <section className="rounded-xl border p-4 space-y-3 bg-white">
                        <div className="font-medium">Locale & Notifications</div>
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <label className="flex flex-col">
                                <span>Time zone (IANA)</span>
                                <input
                                    className="border rounded px-2 py-1"
                                    value={f.timeZoneId}
                                    onChange={(e) => setF({ ...f, timeZoneId: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </label>

                            <label className="flex flex-col">
                                <span>Locale</span>
                                <input
                                    className="border rounded px-2 py-1"
                                    value={f.locale}
                                    onChange={(e) => setF({ ...f, locale: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.emailEnabled}
                                    onChange={(e) => setF({ ...f, emailEnabled: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Email enabled</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.smsEnabled}
                                    onChange={(e) => setF({ ...f, smsEnabled: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>SMS enabled</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={f.sendBookingConfirmation}
                                    onChange={(e) => setF({ ...f, sendBookingConfirmation: e.target.checked })}
                                    disabled={!canEdit}
                                />
                                <span>Send booking confirmations</span>
                            </label>

                            <label className="flex flex-col">
                                <span>Reminder (hours before)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="border rounded px-2 py-1"
                                    value={f.reminderHoursBefore ?? ""}
                                    onChange={(e) =>
                                        setF({
                                            ...f,
                                            reminderHoursBefore:
                                                e.target.value === "" ? null : Math.max(0, Number(e.target.value || 0)),
                                        })
                                    }
                                    disabled={!canEdit}
                                />
                            </label>
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            onClick={save}
                            disabled={!canEdit || saving}
                        >
                            {saving ? "Saving…" : "Save Settings"}
                        </button>
                    </div>
                </>
            )}

            {activeTab === "access" && (
                <div className="space-y-6">
                    <ProviderAccessManager />
                </div>
            )}
        </div>
    );
}
