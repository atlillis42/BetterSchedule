using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Organization-wide preferences for calendar display, booking policy, and UX.
    /// These settings do not encode individual provider availability (that lives in ProviderAvailability).
    /// Controllers and the SPA read these knobs to decide how the calendar looks and how strictly rules apply.
    /// </summary>
    public class OrganizationSettings
    {
        /// <summary>
        /// Primary key and foreign key to <see cref="Organization"/>.
        /// </summary>
        [Key, Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>
        /// Navigation to owning organization.
        /// </summary>
        public Organization Organization { get; set; } = default!;

        // --------------------------------------------------------------------
        // Booking windows / guardrails
        // --------------------------------------------------------------------

        /// <summary>
        /// Minimum lead time required to create or reschedule a reservation, in minutes.
        /// Controllers should reject attempts that violate this window unless an allowed override applies.
        /// </summary>
        [Range(0, 10080)]
        public int MinLeadMinutes { get; set; } = 0;

        /// <summary>
        /// Hours prior to the start after which a reservation cannot be modified/canceled (without override).
        /// </summary>
        [Range(0, 168)]
        public int CancelWindowHours { get; set; } = 2;

        // --------------------------------------------------------------------
        // Calendar display preferences (UI only; does not change availability rules)
        // --------------------------------------------------------------------

        /// <summary>
        /// Whether weekend columns are shown by default in calendar views.
        /// </summary>
        public bool ShowWeekends { get; set; } = true;

        /// <summary>
        /// First day of week for week/month views. 0 = Sunday, 1 = Monday, etc.
        /// </summary>
        [Range(0, 6)]
        public int StartOfWeek { get; set; } = 0;

        /// <summary>
        /// Organization "business hours" start (local clock). Used when shading by org hours.
        /// </summary>
        [Required]
        public TimeSpan BusinessHoursStartLocal { get; set; } = new(8, 0, 0);

        /// <summary>
        /// Organization "business hours" end (local clock). Used when shading by org hours.
        /// </summary>
        [Required]
        public TimeSpan BusinessHoursEndLocal { get; set; } = new(18, 0, 0);

        /// <summary>
        /// Default calendar view for new sessions.
        /// </summary>
        public DefaultCalendarView DefaultView { get; set; } = DefaultCalendarView.Week;

        // --------------------------------------------------------------------
        // Availability visualization + enforcement policy
        // --------------------------------------------------------------------

        /// <summary>
        /// Which background shading mode to use in the calendar.
        /// None = no shading; OrgBusinessHours = shade outside org hours; ProviderAvailability = shade outside selected provider's windows.
        /// </summary>
        public CalendarShadingMode ShadingMode { get; set; } = CalendarShadingMode.ProviderAvailability;

        /// <summary>
        /// How strictly server-side APIs enforce provider availability when creating/updating reservations.
        /// None = ignore; Warn = allow but mark/warn; BlockProvidersWarnManagers = providers blocked, managers can override; BlockAllRequireOverride = both roles need override.
        /// </summary>
        public AvailabilityEnforcement AvailabilityEnforcement { get; set; } =
            AvailabilityEnforcement.BlockProvidersWarnManagers;

        /// <summary>
        /// If true, the server requires an explicit confirmation/flag when performing an "override" action that violates availability or lead/cancel windows.
        /// </summary>
        public bool RequireConfirmOnOverrides { get; set; } = true;

        /// <summary>
        /// If true, anyone in the org can view provider availability (read-only). Only managers (and optionally providers themselves) may edit it.
        /// </summary>
        public bool AvailabilityPublic { get; set; } = true;

        /// <summary>
        /// If true, providers can edit their own availability; managers can always edit.
        /// </summary>
        public bool ProvidersCanEditOwnAvailability { get; set; } = true;

        // --------------------------------------------------------------------
        // Access control / scoping (resources & appointment types)
        // --------------------------------------------------------------------

        /// <summary>
        /// If true, providers see and may book only the resources they have access to (via ProviderResourceAccess).
        /// Managers always see all resources.
        /// </summary>
        public bool LimitProvidersToAssignedResources { get; set; } = false;

        /// <summary>
        /// If true and a provider has no ProviderResourceAccess rows, treat as "no restriction" (fail-open).
        /// If false, treat as "no access" (strict).
        /// </summary>
        public bool FailOpenWhenNoResourceAssignments { get; set; } = true;

        /// <summary>
        /// If true, providers see and may use only appointment types granted to them (via ProviderAppointmentTypeAccess) or ones they created.
        /// Managers always see all appointment types.
        /// </summary>
        public bool LimitProvidersToAssignedAppointmentTypes { get; set; } = false;

        /// <summary>
        /// If true and a provider has no ProviderAppointmentTypeAccess rows, treat as "no restriction" (fail-open).
        /// If false, treat as "no access" (strict).
        /// </summary>
        public bool FailOpenWhenNoTypeAssignments { get; set; } = true;

        /// <summary>
        /// If true, enforce appointment-type ↔ resource rules.
        /// - If an AppointmentType sets AssignedResourceId, require that resource unless a manager overrides.
        /// - If AppointmentTypeResourceAccess rows exist for the type, require the selected resource to be in that set.
        /// </summary>
        public bool EnforceAppointmentTypeResourceRules { get; set; } = false;

        // --------------------------------------------------------------------
        // Timezone & locale (for consistent UI formatting and server-side conversions)
        // --------------------------------------------------------------------

        /// <summary>
        /// IANA timezone id used as the default org timezone for display and local-time rules (e.g., availability windows).
        /// </summary>
        [Required, MaxLength(64)]
        public string TimeZoneId { get; set; } = "America/New_York";

        /// <summary>
        /// UI/formatting locale (e.g., "en-US").
        /// </summary>
        [MaxLength(16)]
        public string Locale { get; set; } = "en-US";

        // --------------------------------------------------------------------
        // Notifications (lightweight toggles; actual delivery pipelines can come later)
        // --------------------------------------------------------------------

        /// <summary>
        /// Enables email notifications (confirmations, reminders) once configured.
        /// </summary>
        public bool EmailEnabled { get; set; } = false;

        /// <summary>
        /// Enables SMS notifications (confirmations, reminders) once configured.
        /// </summary>
        public bool SmsEnabled { get; set; } = false;

        /// <summary>
        /// Sends confirmation on successful booking if the corresponding channel is enabled.
        /// </summary>
        public bool SendBookingConfirmation { get; set; } = false;

        /// <summary>
        /// If set, send a reminder this many hours before the reservation start (channels must be enabled).
        /// </summary>
        public int? ReminderHoursBefore { get; set; } = null;

        // --------------------------------------------------------------------
        // === Future-ready toggles (commented until we implement them end-to-end) ===
        // --------------------------------------------------------------------

        ///// <summary>
        ///// If true, require clients to be authenticated and explicitly allowed for self-booking.
        ///// </summary>
        //public bool AllowClientSelfBooking { get; set; } = true;

        ///// <summary>
        ///// Limit how far in advance clients may book (days).
        ///// </summary>
        //public int? ClientBookingMaxDaysAhead { get; set; } = 60;

        ///// <summary>
        ///// If true, require a signed waiver on file for appointment types that set RequiresWaiver.
        ///// </summary>
        //public bool EnforceWaivers { get; set; } = false;

        ///// <summary>
        ///// Enable payments and set default deposit requirement (%) for applicable appointment types.
        ///// </summary>
        //public bool PaymentsEnabled { get; set; } = false;
        //public decimal? DefaultDepositPercent { get; set; }

        ///// <summary>
        ///// Enable external calendar sync features.
        ///// </summary>
        //public bool GoogleCalendarSyncEnabled { get; set; } = false;
        //public bool OutlookSyncEnabled { get; set; } = false;

        ///// <summary>
        ///// Audit and retention policy (days).
        ///// </summary>
        //public int? AuditRetentionDays { get; set; }
    }

    /// <summary>
    /// Calendar shading options for the SPA.
    /// </summary>
    public enum CalendarShadingMode
    {
        /// <summary>No background shading.</summary>
        None = 0,

        /// <summary>Shade outside org business hours (see BusinessHoursStartLocal/EndLocal).</summary>
        OrgBusinessHours = 1,

        /// <summary>Shade outside the selected provider’s availability windows.</summary>
        ProviderAvailability = 2
    }

    /// <summary>
    /// Server-side enforcement levels for provider availability checks.
    /// </summary>
    public enum AvailabilityEnforcement
    {
        /// <summary>Ignore availability (no server checks).</summary>
        None = 0,

        /// <summary>Allow but warn (e.g., via response header) so the client can toast.</summary>
        Warn = 1,

        /// <summary>Providers are blocked by default; managers can proceed (with optional explicit override confirmation).</summary>
        BlockProvidersWarnManagers = 2,

        /// <summary>Both providers and managers must explicitly confirm/flag an override to proceed.</summary>
        BlockAllRequireOverride = 3
    }

    /// <summary>
    /// Default calendar view for new sessions.
    /// </summary>
    public enum DefaultCalendarView
    {
        Day = 0,
        Week = 1,
        Month = 2,
        Resources = 3
    }
}
