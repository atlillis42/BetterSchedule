import { useEffect, useMemo, useState } from "react";
import { updateOrgSettings } from "@/api/org-settings-api";
import { toast } from "react-toastify";
import type { OrgSettingsForm } from "./OrgSettingsManager";

/** Small accessible toggle switch. */
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
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 ${enabled ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

function formatTimeZoneDisplay(tzId: string): string {
    const now = new Date();
    let abbr = tzId;
    try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: tzId, timeZoneName: "short" }).formatToParts(now);
        const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
        if (tzPart) abbr = tzPart;
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

export default function OrgSettingsModal(props: {
    open: boolean;
    initial: OrgSettingsForm;
    onSaved: (next: OrgSettingsForm) => void;
    onClose: () => void;
}) {
    const { open, initial, onSaved, onClose } = props;

    const [form, setForm] = useState<OrgSettingsForm>(initial);
    const [saving, setSaving] = useState(false);

    const EMAIL_PROVIDERS = ["SMTP", "SendGrid", "Mailgun"] as const;
    const SMS_PROVIDERS = ["Twilio", "Vonage", "MessageBird"] as const;

    const [emailFrom, setEmailFrom] = useState("");
    const [emailProvider, setEmailProvider] = useState<(typeof EMAIL_PROVIDERS)[number]>("SMTP");
    const [smsFrom, setSmsFrom] = useState("");
    const [smsProvider, setSmsProvider] = useState<(typeof SMS_PROVIDERS)[number]>("Twilio");

    useEffect(() => {
        setForm(initial);
    }, [initial, open]);

    const normalizeHHmmOrHHmmss = (v: string) => (/^\d{1,2}:\d{2}$/.test(v) ? `${v}:00` : v);

    const businessHoursInvalid = useMemo(() => {
        const start = normalizeHHmmOrHHmmss(form.businessHoursStartLocal);
        const end = normalizeHHmmOrHHmmss(form.businessHoursEndLocal);
        return end <= start;
    }, [form]);

    async function save() {
        if (businessHoursInvalid) {
            toast.error("Business hours end must be after start.");
            return;
        }
        setSaving(true);
        try {
            await updateOrgSettings({
                minLeadMinutes: form.minLeadMinutes,
                cancelWindowHours: form.cancelWindowHours,
                businessHoursStartLocal: normalizeHHmmOrHHmmss(form.businessHoursStartLocal),
                businessHoursEndLocal: normalizeHHmmOrHHmmss(form.businessHoursEndLocal),
                requireConfirmOnOverrides: form.requireConfirmOnOverrides,
                timeZoneId: form.timeZoneId,
                locale: form.locale,
                emailEnabled: form.emailEnabled,
                smsEnabled: form.smsEnabled,
                sendBookingConfirmation: form.sendBookingConfirmation,
                reminderHoursBefore: form.reminderHoursBefore,
            });

            onSaved({
                ...form,
                businessHoursStartLocal: normalizeHHmmOrHHmmss(form.businessHoursStartLocal),
                businessHoursEndLocal: normalizeHHmmOrHHmmss(form.businessHoursEndLocal),
            });
        } catch {
            toast.error("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    const emailPreviewSubject = form.sendBookingConfirmation ? "Your appointment is confirmed" : "Sample email subject";

    const emailPreviewBody = [
        "Hi {{ClientName}},",
        "",
        "Thanks for booking with {{OrganizationName}}.",
        "Your {{ServiceName}} is scheduled for {{StartLocal}} with {{ProviderName}}.",
        "",
        form.reminderHoursBefore
            ? `We’ll remind you ${form.reminderHoursBefore} hour(s) before the appointment.`
            : "Reminders are currently disabled.",
        "",
        "Need to make changes? Visit {{ManageLink}}.",
        "",
        "— The {{OrganizationName}} team",
    ].join("\n");

    const smsPreviewBody = [
        "Hi {{ClientName}},",
        "Your {{ServiceName}} with {{ProviderName}} is confirmed for {{StartLocal}}.",
        "Manage or cancel: {{ManageLink}}",
        "Reply STOP to opt out.",
    ].join("\n");

    if (!open) return null;

    const tzDisplay = formatTimeZoneDisplay(form.timeZoneId);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="bs-modal w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                    <h2 className="text-base font-semibold">Edit Organization Settings</h2>
                    <button
                        className="rounded p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700"
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
                    {/* Booking & Policy */}
                    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Booking &amp; Policy</div>
                        <div className="grid gap-3 text-sm md:grid-cols-3">
                            <label className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Minimum advance booking time (minutes)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                                    value={form.minLeadMinutes}
                                    onChange={(e) =>
                                        setForm({ ...form, minLeadMinutes: Math.max(0, Number(e.target.value || 0)) })
                                    }
                                    aria-describedby="desc-minlead"
                                />
                                <span id="desc-minlead" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Clients must book or reschedule at least this many minutes before start time of appointment.
                                </span>
                            </label>

                            <label className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Late-cancellation window (hours)</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                                    value={form.cancelWindowHours}
                                    onChange={(e) =>
                                        setForm({ ...form, cancelWindowHours: Math.max(0, Number(e.target.value || 0)) })
                                    }
                                    aria-describedby="desc-cancelwin"
                                />
                                <span id="desc-cancelwin" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Cancellations within this many hours of start are marked late for reporting/policy; this does not block cancellation.
                                </span>
                            </label>

                            <div className="flex flex-col justify-between rounded border border-slate-200 px-3 py-2 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-800 dark:text-slate-200">Confirm overrides</span>
                                    <Toggle
                                        enabled={form.requireConfirmOnOverrides}
                                        onToggle={() =>
                                            setForm({ ...form, requireConfirmOnOverrides: !form.requireConfirmOnOverrides })
                                        }
                                        ariaLabel="Confirm overrides"
                                    />
                                </div>
                                <span className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Prompts staff to confirm when bypassing booking rules (e.g., lead time).
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Business Time & Calendar */}
                    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Business Time &amp; Calendar</div>
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                            <label className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Business start</span>
                                <input
                                    type="time"
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                                    value={form.businessHoursStartLocal.slice(0, 5)}
                                    onChange={(e) =>
                                        setForm({ ...form, businessHoursStartLocal: `${e.target.value}:00` })
                                    }
                                    aria-describedby="desc-busstart"
                                />
                                <span id="desc-busstart" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Start of your standard office hours in the org time zone. Used for displays and defaults; does not restrict booking by itself.
                                </span>
                            </label>

                            <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Business time zone</span>
                                <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200">
                                    {tzDisplay}
                                </div>
                                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Used to calculate office hours and notifications.
                                </span>
                            </div>

                            <label className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Business end</span>
                                <input
                                    type="time"
                                    className={`rounded border px-2 py-1 ${businessHoursInvalid
                                            ? "border-red-500"
                                            : "border-slate-300 dark:border-slate-600"
                                        } bg-white text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800`}
                                    value={form.businessHoursEndLocal.slice(0, 5)}
                                    onChange={(e) =>
                                        setForm({ ...form, businessHoursEndLocal: `${e.target.value}:00` })
                                    }
                                    aria-describedby="desc-busend"
                                />
                                {businessHoursInvalid ? (
                                    <span className="mt-1 text-xs text-red-600 dark:text-red-400">End must be after start.</span>
                                ) : (
                                    <span id="desc-busend" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        End of your standard office hours. Used for displays and defaults; does not restrict booking by itself.
                                    </span>
                                )}
                            </label>

                            <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200">Locale</span>
                                <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200">
                                    {form.locale}
                                </div>
                                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Affects dates, numbers, and formatting across the app.
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Notifications & Messaging */}
                    <section className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Notifications &amp; Messaging</div>

                        {/* Email Delivery */}
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Email Delivery</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-700 dark:text-slate-200">Enable Email</span>
                                    <Toggle
                                        enabled={form.emailEnabled}
                                        onToggle={() => setForm({ ...form, emailEnabled: !form.emailEnabled })}
                                        ariaLabel="Enable Email"
                                    />
                                </div>
                            </div>

                            {form.emailEnabled && (
                                <>
                                    <div className="grid gap-3 text-sm md:grid-cols-2">
                                        <label className="flex flex-col">
                                            <span className="text-slate-800 dark:text-slate-200">From address</span>
                                            <input
                                                className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                                                placeholder="no-reply@yourbusiness.com"
                                                value={emailFrom}
                                                onChange={(e) => setEmailFrom(e.target.value)}
                                            />
                                        </label>
                                        <label className="flex flex-col">
                                            <span className="text-slate-800 dark:text-slate-200">Provider</span>
                                            <select
                                                className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
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
                                    <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                        <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Email Template Preview</div>

                                        {/* Merge fields explainer */}
                                        <div className="mb-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-700/50">
                                            <div className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Merge fields (auto-filled in messages)
                                            </div>
                                            <ul className="flex flex-wrap gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                                {["Client Name", "Provider Name", "Service Name", "Start (local)", "Manage Link"].map((label) => (
                                                    <li key={label} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                                                        <span className="font-medium">{label}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                            <div className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{emailPreviewSubject}</div>
                                            <pre className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-100">
                                                {emailPreviewBody}
                                            </pre>
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                                Edit template
                                            </button>
                                            <button className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                                Preview send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* SMS Delivery */}
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">SMS Delivery</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-700 dark:text-slate-200">Enable SMS</span>
                                    <Toggle
                                        enabled={form.smsEnabled}
                                        onToggle={() => setForm({ ...form, smsEnabled: !form.smsEnabled })}
                                        ariaLabel="Enable SMS"
                                    />
                                </div>
                            </div>

                            {form.smsEnabled && (
                                <>
                                    <div className="grid gap-3 text-sm md:grid-cols-2">
                                        <label className="flex flex-col">
                                            <span className="text-slate-800 dark:text-slate-200">From number</span>
                                            <input
                                                className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus-visible:ring-offset-slate-800"
                                                placeholder="+1 555-555-5555"
                                                value={smsFrom}
                                                onChange={(e) => setSmsFrom(e.target.value)}
                                            />
                                        </label>
                                        <label className="flex flex-col">
                                            <span className="text-slate-800 dark:text-slate-200">Provider</span>
                                            <select
                                                className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
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

                                    {/* SMS template preview */}
                                    <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                        <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">SMS Template Preview</div>

                                        <div className="mb-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-700/50">
                                            <div className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Merge fields (auto-filled in messages)
                                            </div>
                                            <ul className="flex flex-wrap gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                                {["Client Name", "Provider Name", "Service Name", "Start (local)", "Manage Link"].map((label) => (
                                                    <li key={label} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:ring-slate-600">
                                                        <span className="font-medium">{label}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                            <pre className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-100">{smsPreviewBody}</pre>
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                                Edit template
                                            </button>
                                            <button className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 opacity-50 dark:border-slate-600 dark:text-slate-100" disabled>
                                                Preview send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reminders */}
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Reminders</div>

                                <div className={`ml-3 flex items-center gap-2 ${form.sendBookingConfirmation ? "" : "opacity-50"}`}>
                                    {[48, 24, 12, 2].map((h) => {
                                        const active = form.reminderHoursBefore === h;
                                        return (
                                            <button
                                                key={h}
                                                className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset ${active
                                                        ? "bg-blue-600 text-white ring-blue-600"
                                                        : "text-slate-700 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700/50"
                                                    }`}
                                                onClick={() =>
                                                    form.sendBookingConfirmation &&
                                                    setForm({ ...form, reminderHoursBefore: h })
                                                }
                                                disabled={!form.sendBookingConfirmation}
                                            >
                                                {h}h
                                            </button>
                                        );
                                    })}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Custom</span>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-800"
                                            value={form.reminderHoursBefore ?? ""}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    reminderHoursBefore:
                                                        e.target.value === ""
                                                            ? null
                                                            : Math.max(0, Number(e.target.value || 0)),
                                                })
                                            }
                                            disabled={!form.sendBookingConfirmation}
                                        />
                                        <span className="text-xs text-slate-500 dark:text-slate-400">hours</span>
                                    </div>
                                </div>

                                <div className="ml-auto" />
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-700 dark:text-slate-200">Enable Reminders</span>
                                    <Toggle
                                        enabled={form.sendBookingConfirmation}
                                        onToggle={() =>
                                            setForm((prev) => ({
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

                        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                            This section is a preview of a future feature. Setup fields and templates are placeholders and not wired to a provider yet.
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onClick={onClose} disabled={saving}>
                        Close
                    </button>
                    <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-slate-800"
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
