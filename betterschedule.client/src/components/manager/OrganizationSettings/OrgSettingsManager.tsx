import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    getOrgSettings,
    type DefaultCalendarView,
    type AvailabilityEnforcement,
    type ProviderCancelPolicy,
    type ClientCancelPolicy,
} from "@/api/org-settings-api";
import { useAuth } from "@auth/auth-context";
import OrgSettingsModal from "./OrgSettingsModal";

type Form = {
    minLeadMinutes: number;
    cancelWindowHours: number;
    providerCancelPolicy: ProviderCancelPolicy;
    clientCancelPolicy: ClientCancelPolicy;

    // Calendar
    showWeekends: boolean;
    startOfWeek: number;
    businessHoursStartLocal: string; // "HH:mm:ss"
    businessHoursEndLocal: string;   // "HH:mm:ss"
    defaultView: DefaultCalendarView;

    // Availability flags (kept in model; not rendered here)
    availabilityEnforcement: AvailabilityEnforcement;
    requireConfirmOnOverrides: boolean;
    availabilityPublic: boolean;
    providersCanEditOwnAvailability: boolean;

    // Locale/TZ
    timeZoneId: string;
    locale: string;

    // Notifications
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean;
    reminderHoursBefore: number | null;
};

function labelCancel(v: ProviderCancelPolicy | ClientCancelPolicy) {
    switch (v) {
        case "AnyTime": return "Any time";
        case "RespectWindow": return "Respect cancel window";
        case "None": return "None (managers only)";
        default: return String(v);
    }
}

// "HH:mm:ss" -> "h:mmam/pm"
function hhmmssTo12(hhmmss: string): string {
    const [hStr, mStr] = hhmmss.split(":");
    const h = Math.max(0, Math.min(23, parseInt(hStr || "0", 10)));
    const m = Math.max(0, Math.min(59, parseInt(mStr || "0", 10)));
    const suffix = h < 12 ? "am" : "pm";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

// "America/New_York" -> "EDT — UTC -4" (best-effort)
function formatTimeZoneDisplay(tzId: string): string {
    const now = new Date();

    let abbr = tzId;
    try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: tzId, timeZoneName: "short" }).formatToParts(now);
        abbr = parts.find((p) => p.type === "timeZoneName")?.value ?? tzId;
    } catch { /* noop */ }

    let utc = "UTC";
    try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: tzId, timeZoneName: "shortOffset" }).formatToParts(now);
        const val = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
        const m = val.match(/([UG]MT|UTC)([+-]\d{1,2})(?::(\d{2}))?/i);
        if (m) {
            const sign = m[2].startsWith("-") ? "-" : "+";
            const hours = Math.abs(parseInt(m[2], 10));
            const mins = m[3] ? `:${m[3]}` : "";
            utc = `UTC ${sign}${hours}${mins}`;
        }
    } catch {
        try {
            const s = new Intl.DateTimeFormat("en-US", { timeZone: tzId, timeZoneName: "short" }).format(now);
            const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
            if (m) {
                const sign = m[1].startsWith("-") ? "-" : "+";
                const hours = Math.abs(parseInt(m[1], 10));
                const mins = m[2] ? `:${m[2]}` : "";
                utc = `UTC ${sign}${hours}${mins}`;
            }
        } catch { /* noop */ }
    }

    return `${abbr} — ${utc}`;
}

export default function OrgSettingsManager() {
    const { isManager } = useAuth();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Form | null>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const s = await getOrgSettings();
                setSettings({
                    minLeadMinutes: s.minLeadMinutes,
                    cancelWindowHours: s.cancelWindowHours,
                    providerCancelPolicy: s.providerCancelPolicy ?? "AnyTime",
                    clientCancelPolicy: s.clientCancelPolicy ?? "RespectWindow",

                    showWeekends: s.showWeekends,
                    startOfWeek: s.startOfWeek,
                    businessHoursStartLocal: s.businessHoursStartLocal,
                    businessHoursEndLocal: s.businessHoursEndLocal,
                    defaultView: s.defaultView,

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

    if (loading) return <div className="p-6 text-sm text-gray-600">Loading settings…</div>;
    if (!settings) return <div className="p-6 text-sm text-red-600">Unable to load settings.</div>;

    const hours12 = `${hhmmssTo12(settings.businessHoursStartLocal)}–${hhmmssTo12(settings.businessHoursEndLocal)}`;
    const tzDisplay = formatTimeZoneDisplay(settings.timeZoneId);

    return (
        <div className="p-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Organization Settings</h1>
                        <p className="text-sm text-gray-600">Current configuration overview</p>
                    </div>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={() => setEditing(true)}
                        disabled={!canEdit}
                    >
                        Edit Settings
                    </button>
                </header>

                {/* Booking Policy */}
                <section className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 text-sm font-medium text-gray-800">Booking Policy</div>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-gray-500">Min lead time</dt>
                            <dd className="font-medium">{settings.minLeadMinutes} minutes</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Cancel window</dt>
                            <dd className="font-medium">{settings.cancelWindowHours} hours</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Provider cancel policy</dt>
                            <dd className="font-medium">{labelCancel(settings.providerCancelPolicy)}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Client cancel policy</dt>
                            <dd className="font-medium">{labelCancel(settings.clientCancelPolicy)}</dd>
                        </div>
                    </dl>
                </section>

                {/* Business Time & Calendar */}
                <section className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 text-sm font-medium text-gray-800">Business Time &amp; Calendar</div>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-gray-500">Business hours</dt>
                            <dd className="font-medium">{hours12}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Business time zone</dt>
                            <dd className="font-medium">
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-2 py-0.5 text-xs ring-1 ring-inset ring-gray-200">
                                    {tzDisplay}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Locale</dt>
                            <dd className="font-medium">
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-2 py-0.5 text-xs ring-1 ring-inset ring-gray-200">
                                    {settings.locale}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* Notifications */}
                <section className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 text-sm font-medium text-gray-800">Notifications &amp; Messaging</div>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-gray-500">Email delivery</dt>
                            <dd className="font-medium">{settings.emailEnabled ? "Enabled" : "Disabled"}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">SMS delivery</dt>
                            <dd className="font-medium">{settings.smsEnabled ? "Enabled" : "Disabled"}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Send confirmations</dt>
                            <dd className="font-medium">{settings.sendBookingConfirmation ? "On" : "Off"}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Reminder (hours before)</dt>
                            <dd className="font-medium">{settings.reminderHoursBefore ?? "—"}</dd>
                        </div>
                    </dl>
                </section>
            </div>

            <OrgSettingsModal
                open={editing}
                initial={settings}
                onClose={() => setEditing(false)}
                onSaved={(next) => {
                    setSettings(next);
                    setEditing(false);
                    toast.success("Settings saved.");
                }}
            />
        </div>
    );
}
