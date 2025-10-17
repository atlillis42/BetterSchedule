import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getOrgSettings } from "@/api/org-settings-api";
import { useAuth } from "@auth/auth-context";
import OrgSettingsModal from "./OrgSettingsModal";

/**
 * Shape aligned to OrgSettingsDto.
 */
export type OrgSettingsForm = {
    minLeadMinutes: number;
    cancelWindowHours: number;
    businessHoursStartLocal: string; // "HH:mm:ss"
    businessHoursEndLocal: string;   // "HH:mm:ss"
    requireConfirmOnOverrides: boolean;
    timeZoneId: string;
    locale: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean;
    reminderHoursBefore: number | null;
};

/**
 * Convert "HH:mm:ss" to a 12-hour label like "h:mmam/pm".
 * @param hhmmss - Time string in "HH:mm:ss".
 */
function hhmmssTo12(hhmmss: string): string {
    const [hStr, mStr] = hhmmss.split(":");
    const h = Math.max(0, Math.min(23, parseInt(hStr || "0", 10)));
    const m = Math.max(0, Math.min(59, parseInt(mStr || "0", 10)));
    const suffix = h < 12 ? "am" : "pm";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
}

/**
 * Formats an IANA time zone into a short label like "EDT — UTC -4".
 * Falls back gracefully if the environment lacks support.
 * @param tzId - IANA zone.
 */
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

/**
 * Read-only overview of organization settings with an Edit action for managers.
 * Strictly limited to the server DTO surface.
 */
export default function OrgSettingsManager() {
    const { isManager } = useAuth();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<OrgSettingsForm | null>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const s = await getOrgSettings();
                const next: OrgSettingsForm = {
                    minLeadMinutes: s.minLeadMinutes,
                    cancelWindowHours: s.cancelWindowHours,
                    businessHoursStartLocal: s.businessHoursStartLocal,
                    businessHoursEndLocal: s.businessHoursEndLocal,
                    requireConfirmOnOverrides: s.requireConfirmOnOverrides,
                    timeZoneId: s.timeZoneId,
                    locale: s.locale,
                    emailEnabled: s.emailEnabled,
                    smsEnabled: s.smsEnabled,
                    sendBookingConfirmation: s.sendBookingConfirmation,
                    reminderHoursBefore: s.reminderHoursBefore ?? null,
                };
                setSettings(next);
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
                            <dt className="text-gray-500">Minimum advance booking time</dt>
                            <dd className="font-medium">{settings.minLeadMinutes} minutes</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Late-cancellation window</dt>
                            <dd className="font-medium">{settings.cancelWindowHours} hours</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Confirm overrides</dt>
                            <dd className="font-medium">{settings.requireConfirmOnOverrides ? "On" : "Off"}</dd>
                        </div>
                    </dl>
                </section>

                {/* Business Time */}
                <section className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 text-sm font-medium text-gray-800">Business Time &amp; Locale</div>
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
                            <dt className="text-gray-500">Reminders enabled</dt>
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