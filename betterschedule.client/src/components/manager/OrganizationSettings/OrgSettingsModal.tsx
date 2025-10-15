import { useEffect, useMemo, useState } from "react";
import {
    updateOrgSettings,
    type DefaultCalendarView,
    type AvailabilityEnforcement,
    type ProviderCancelPolicy,
    type ClientCancelPolicy,
} from "@/api/org-settings-api";
import { toast } from "react-toastify";

type Form = {
    minLeadMinutes: number;
    cancelWindowHours: number;
    providerCancelPolicy: ProviderCancelPolicy;
    clientCancelPolicy: ClientCancelPolicy;

    // calendar (Default view preserved, not shown)
    showWeekends: boolean;
    startOfWeek: number;
    businessHoursStartLocal: string; // "HH:mm:ss"
    businessHoursEndLocal: string;   // "HH:mm:ss"
    defaultView: DefaultCalendarView;

    // availability
    availabilityEnforcement: AvailabilityEnforcement;
    requireConfirmOnOverrides: boolean; // preserved
    availabilityPublic: boolean;        // preserved
    providersCanEditOwnAvailability: boolean; // preserved

    // tz/locale
    timeZoneId: string;
    locale: string;

    // notifications
    emailEnabled: boolean;
    smsEnabled: boolean;
    sendBookingConfirmation: boolean; // Reminders enabled
    reminderHoursBefore: number | null;
};

/** Reusable toggle switch */
function Toggle({
    enabled,
    onToggle,
    ariaLabel,
}: {
    enabled: boolean;
    onToggle: () => void;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={ariaLabel}
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition ${enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

/** "America/New_York" -> "EDT — UTC -4" (best-effort) */
function formatTimeZoneDisplay(tzId: string): string {
    const now = new Date();
    let abbr = tzId;
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tzId,
            timeZoneName: "short",
        }).formatToParts(now);
        const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
        if (tzPart) abbr = tzPart;
    } catch { /* empty */ }

    let utc = "UTC";
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tzId,
            timeZoneName: "shortOffset",
        }).formatToParts(now);
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
            const s = new Intl.DateTimeFormat("en-US", {
                timeZone: tzId,
                timeZoneName: "short",
            }).format(now);
            const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
            if (m) {
                const sign = m[1].startsWith("-") ? "-" : "+";
                const hours = Math.abs(parseInt(m[1], 10));
                const mins = m[2] ? `:${m[2]}` : "";
                utc = `UTC ${sign}${hours}${mins}`;
            }
        } catch { /* empty */ }
    }

    return `${abbr} — ${utc}`;
}

export default function OrgSettingsModal(props: {
    open: boolean;
    initial: Form;
    onSaved: (next: Form) => void;
    onClose: () => void;
}) {
    const { open, initial, onSaved, onClose } = props;

    const [f, setF] = useState<Form>(initial);
    const [saving, setSaving] = useState(false);

    // Demo-only provider setup UI state (not persisted)
    const EMAIL_PROVIDERS = ["SMTP", "SendGrid", "Mailgun"] as const;
    const SMS_PROVIDERS = ["Twilio", "Vonage", "MessageBird"] as const;

    const [emailFrom, setEmailFrom] = useState("");
    const [emailProvider, setEmailProvider] =
        useState<(typeof EMAIL_PROVIDERS)[number]>("SMTP");

    const [smsFrom, setSmsFrom] = useState("");
    const [smsProvider, setSmsProvider] =
        useState<(typeof SMS_PROVIDERS)[number]>("Twilio");

    useEffect(() => {
        setF(initial);
    }, [initial, open]);

    const normalizeHHmmOrHHmmss = (v: string) =>
        /^\d{1,2}:\d{2}$/.test(v) ? `${v}:00` : v;

    const businessHoursInvalid = useMemo(() => {
        const start = normalizeHHmmOrHHmmss(f.businessHoursStartLocal);
        const end = normalizeHHmmOrHHmmss(f.businessHoursEndLocal);
        return end <= start;
    }, [f]);

    async function save() {
        if (businessHoursInvalid) {
            toast.error("Business hours end must be after start.");
            return;
        }
        setSaving(true);
        try {
            await updateOrgSettings({
                minLeadMinutes: f.minLeadMinutes,
                cancelWindowHours: f.cancelWindowHours,
                providerCancelPolicy: f.providerCancelPolicy,
                clientCancelPolicy: f.clientCancelPolicy,

                showWeekends: f.showWeekends,
                startOfWeek: f.startOfWeek,
                businessHoursStartLocal: normalizeHHmmOrHHmmss(f.businessHoursStartLocal),
                businessHoursEndLocal: normalizeHHmmOrHHmmss(f.businessHoursEndLocal),
                defaultView: f.defaultView,

                availabilityEnforcement: f.availabilityEnforcement,
                requireConfirmOnOverrides: f.requireConfirmOnOverrides,
                availabilityPublic: f.availabilityPublic,
                providersCanEditOwnAvailability: f.providersCanEditOwnAvailability,

                timeZoneId: f.timeZoneId,
                locale: f.locale,

                emailEnabled: f.emailEnabled,
                smsEnabled: f.smsEnabled,
                sendBookingConfirmation: f.sendBookingConfirmation,
                reminderHoursBefore: f.reminderHoursBefore,
            });

            onSaved(f);
        } catch {
            toast.error("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    // Previews
    const emailPreviewSubject = f.sendBookingConfirmation
        ? "Your appointment is confirmed"
        : "Sample email subject";

    const emailPreviewBody = [
        "Hi {{ClientName}},",
        "",
        "Thanks for booking with {{OrganizationName}}.",
        "Your {{ServiceName}} is scheduled for {{StartLocal}} with {{ProviderName}}.",
        "",
        f.reminderHoursBefore
            ? `We’ll remind you ${f.reminderHoursBefore} hour(s) before the appointment.`
            : "Reminders are currently disabled.",
        "",
        "Need to make changes? Visit {{ManageLink}}.",
        "",
        "— The {{OrganizationName}} team",
    ].join("\n");

    const smsPreviewBody = [
        "Hi {{ClientName}},",
        `Your {{ServiceName}} with {{ProviderName}} is confirmed for {{StartLocal}}.`,
        "Manage or cancel: {{ManageLink}}",
        "Reply STOP to opt out.",
    ].join("\n");

    if (!open) return null;

    const tzDisplay = formatTimeZoneDisplay(f.timeZoneId);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h2 className="text-base font-semibold">Edit Organization Settings</h2>
                    <button
                        className="rounded p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                            <path
                                d="M14.348 5.652a.8.8 0 0 0-1.131-1.131L10 7.738 6.783 4.521A.8.8 0 1 0 5.652 5.652L8.869 8.87l-3.217 3.217a.8.8 0 1 0 1.131 1.131L10 10.001l3.217 3.217a.8.8 0 1 0 1.131-1.131L11.131 8.87l3.217-3.217Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[75vh] overflow-auto px-5 py-4">
                    {/* Booking & Availability */}
                    <section className="mb-4 rounded-xl border bg-white p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Booking &amp; Availability</div>
                        <div className="grid gap-3 text-sm md:grid-cols-3">
                            <label className="flex flex-col">
                                <span>Min lead time (minutes)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="rounded border px-2 py-1"
                                    value={f.minLeadMinutes}
                                    onChange={(e) =>
                                        setF({ ...f, minLeadMinutes: Math.max(0, Number(e.target.value || 0)) })
                                    }
                                />
                            </label>

                            <label className="flex flex-col">
                                <span>Cancel window (hours)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="rounded border px-2 py-1"
                                    value={f.cancelWindowHours}
                                    onChange={(e) =>
                                        setF({ ...f, cancelWindowHours: Math.max(0, Number(e.target.value || 0)) })
                                    }
                                />
                            </label>

                            <label className="flex flex-col">
                                <span>Availability enforcement</span>
                                <select
                                    className="rounded border px-2 py-1"
                                    value={f.availabilityEnforcement}
                                    onChange={(e) =>
                                        setF({
                                            ...f,
                                            availabilityEnforcement: e.target.value as AvailabilityEnforcement,
                                        })
                                    }
                                >
                                    <option value="None">None</option>
                                    <option value="Warn">Warn</option>
                                    <option value="BlockProvidersWarnManagers">BlockProvidersWarnManagers</option>
                                    <option value="BlockAllRequireOverride">BlockAllRequireOverride</option>
                                </select>
                            </label>

                            <label className="flex flex-col">
                                <span>Provider cancel policy</span>
                                <select
                                    className="rounded border px-2 py-1"
                                    value={f.providerCancelPolicy}
                                    onChange={(e) =>
                                        setF({ ...f, providerCancelPolicy: e.target.value as ProviderCancelPolicy })
                                    }
                                >
                                    <option value="AnyTime">AnyTime</option>
                                    <option value="RespectWindow">RespectWindow</option>
                                    <option value="None">None</option>
                                </select>
                            </label>

                            <label className="flex flex-col">
                                <span>Client cancel policy</span>
                                <select
                                    className="rounded border px-2 py-1"
                                    value={f.clientCancelPolicy}
                                    onChange={(e) =>
                                        setF({ ...f, clientCancelPolicy: e.target.value as ClientCancelPolicy })
                                    }
                                >
                                    <option value="AnyTime">AnyTime</option>
                                    <option value="RespectWindow">RespectWindow</option>
                                    <option value="None">None</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    {/* Business Time & Calendar (2x2 layout) */}
                    <section className="mb-4 rounded-xl border bg-white p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Business Time &amp; Calendar</div>
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                            {/* Row 1: Start + Business TZ */}
                            <label className="flex flex-col">
                                <span>Business start</span>
                                <input
                                    type="time"
                                    className="rounded border px-2 py-1"
                                    value={f.businessHoursStartLocal.slice(0, 5)}
                                    onChange={(e) =>
                                        setF({ ...f, businessHoursStartLocal: `${e.target.value}:00` })
                                    }
                                />
                            </label>

                            <div className="flex flex-col">
                                <span>Business time zone</span>
                                <div className="rounded border bg-gray-50 px-2 py-1 text-sm text-gray-800">
                                    {tzDisplay}
                                </div>
                                <span className="mt-1 text-xs text-gray-500">
                                    Used to calculate office hours and notifications.
                                </span>
                            </div>

                            {/* Row 2: End + Locale */}
                            <label className="flex flex-col">
                                <span>Business end</span>
                                <input
                                    type="time"
                                    className={`rounded border px-2 py-1 ${businessHoursInvalid ? "border-red-500" : ""
                                        }`}
                                    value={f.businessHoursEndLocal.slice(0, 5)}
                                    onChange={(e) =>
                                        setF({ ...f, businessHoursEndLocal: `${e.target.value}:00` })
                                    }
                                />
                                {businessHoursInvalid && (
                                    <span className="mt-1 text-xs text-red-600">End must be after start.</span>
                                )}
                            </label>

                            <div className="flex flex-col">
                                <span>Locale</span>
                                <div className="rounded border bg-gray-50 px-2 py-1 text-sm text-gray-800">
                                    {f.locale}
                                </div>
                                <span className="mt-1 text-xs text-gray-500">
                                    Affects dates, numbers, and formatting across the app.
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Notifications & Messaging */}
                    <section className="mb-4 space-y-4 rounded-xl border bg-white p-3">
                        <div className="mb-2 text-sm font-medium text-gray-800">Notifications &amp; Messaging</div>

                        {/* Email Delivery */}
                        <div className="rounded-xl border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-800">Email Delivery</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-700">Enable Email</span>
                                    <Toggle
                                        enabled={f.emailEnabled}
                                        onToggle={() => setF({ ...f, emailEnabled: !f.emailEnabled })}
                                        ariaLabel="Enable Email"
                                    />
                                </div>
                            </div>

                            {f.emailEnabled && (
                                <>
                                    <div className="grid gap-3 text-sm md:grid-cols-2">
                                        <label className="flex flex-col">
                                            <span>From address</span>
                                            <input
                                                className="rounded border px-2 py-1"
                                                placeholder="no-reply@yourbusiness.com"
                                                value={emailFrom}
                                                onChange={(e) => setEmailFrom(e.target.value)}
                                            />
                                        </label>
                                        <label className="flex flex-col">
                                            <span>Provider</span>
                                            <select
                                                className="rounded border px-2 py-1"
                                                value={emailProvider}
                                                onChange={(e) =>
                                                    setEmailProvider(e.target.value as (typeof EMAIL_PROVIDERS)[number])
                                                }
                                            >
                                                {EMAIL_PROVIDERS.map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    {/* Email template preview */}
                                    <div className="mt-3 rounded-xl border p-3">
                                        <div className="mb-2 text-sm font-medium text-gray-800">Email Template Preview</div>

                                        {/* Merge fields explainer */}
                                        <div className="mb-3 rounded-lg bg-gray-50 p-2">
                                            <div className="mb-1 text-xs font-medium text-gray-700">Merge fields (auto-filled in messages)</div>
                                            <ul className="flex flex-wrap gap-2 text-[11px] text-gray-700">
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Client Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Provider Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Service Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Start (local)</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Manage Link</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="rounded-lg border bg-white p-3">
                                            <div className="mb-2 text-sm font-semibold">{emailPreviewSubject}</div>
                                            <pre className="whitespace-pre-wrap text-xs text-gray-800">{emailPreviewBody}</pre>
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-50" disabled>
                                                Edit template
                                            </button>
                                            <button className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-50" disabled>
                                                Preview send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* SMS Delivery */}
                        <div className="rounded-xl border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-800">SMS Delivery</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-700">Enable SMS</span>
                                    <Toggle
                                        enabled={f.smsEnabled}
                                        onToggle={() => setF({ ...f, smsEnabled: !f.smsEnabled })}
                                        ariaLabel="Enable SMS"
                                    />
                                </div>
                            </div>

                            {f.smsEnabled && (
                                <>
                                    <div className="grid gap-3 text-sm md:grid-cols-2">
                                        <label className="flex flex-col">
                                            <span>From number</span>
                                            <input
                                                className="rounded border px-2 py-1"
                                                placeholder="+1 555-555-5555"
                                                value={smsFrom}
                                                onChange={(e) => setSmsFrom(e.target.value)}
                                            />
                                        </label>
                                        <label className="flex flex-col">
                                            <span>Provider</span>
                                            <select
                                                className="rounded border px-2 py-1"
                                                value={smsProvider}
                                                onChange={(e) =>
                                                    setSmsProvider(e.target.value as (typeof SMS_PROVIDERS)[number])
                                                }
                                            >
                                                {SMS_PROVIDERS.map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    {/* SMS template preview (more robust) */}
                                    <div className="mt-3 rounded-xl border p-3">
                                        <div className="mb-2 text-sm font-medium text-gray-800">SMS Template Preview</div>

                                        <div className="mb-3 rounded-lg bg-gray-50 p-2">
                                            <div className="mb-1 text-xs font-medium text-gray-700">Merge fields (auto-filled in messages)</div>
                                            <ul className="flex flex-wrap gap-2 text-[11px] text-gray-700">
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Client Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Provider Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Service Name</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Start (local)</span>
                                                </li>
                                                <li className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                                                    <span className="font-medium">Manage Link</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="rounded-lg border bg-white p-3">
                                            <pre className="whitespace-pre-wrap text-xs text-gray-800">{smsPreviewBody}</pre>
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-50" disabled>
                                                Edit template
                                            </button>
                                            <button className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-50" disabled>
                                                Preview send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reminders (inline row + far-right switch) */}
                        <div className="rounded-xl border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-medium text-gray-800">Reminders</div>

                                {/* Presets + custom on one line */}
                                <div
                                    className={`ml-3 flex items-center gap-2 ${f.sendBookingConfirmation ? "" : "opacity-50"
                                        }`}
                                >
                                    {[48, 24, 12, 2].map((h) => {
                                        const active = f.reminderHoursBefore === h;
                                        return (
                                            <button
                                                key={h}
                                                className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset ${active
                                                        ? "bg-blue-600 text-white ring-blue-600"
                                                        : "text-gray-700 ring-gray-300 hover:bg-gray-50"
                                                    }`}
                                                onClick={() =>
                                                    f.sendBookingConfirmation &&
                                                    setF({ ...f, reminderHoursBefore: h })
                                                }
                                                disabled={!f.sendBookingConfirmation}
                                            >
                                                {h}h
                                            </button>
                                        );
                                    })}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Custom</span>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded border px-2 py-1 text-sm"
                                            value={f.reminderHoursBefore ?? ""}
                                            onChange={(e) =>
                                                setF({
                                                    ...f,
                                                    reminderHoursBefore:
                                                        e.target.value === ""
                                                            ? null
                                                            : Math.max(0, Number(e.target.value || 0)),
                                                })
                                            }
                                            disabled={!f.sendBookingConfirmation}
                                        />
                                        <span className="text-xs text-gray-500">hours</span>
                                    </div>
                                </div>

                                {/* Spacer then right-aligned switch */}
                                <div className="ml-auto" />
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-700">Enable Reminders</span>
                                    <Toggle
                                        enabled={f.sendBookingConfirmation}
                                        onToggle={() =>
                                            setF((prev) => ({
                                                ...prev,
                                                sendBookingConfirmation: !prev.sendBookingConfirmation,
                                                reminderHoursBefore:
                                                    !prev.sendBookingConfirmation
                                                        ? prev.reminderHoursBefore ?? 24
                                                        : prev.reminderHoursBefore,
                                            }))
                                        }
                                        ariaLabel="Enable Reminders"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Future feature callout at the bottom */}
                        <div className="rounded-lg border border-dashed bg-blue-50 px-3 py-2 text-xs text-blue-800">
                            This section is a preview of a future feature. Setup fields and templates are placeholders and not wired to a provider yet.
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
                    <button
                        className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={save}
                        disabled={saving}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
