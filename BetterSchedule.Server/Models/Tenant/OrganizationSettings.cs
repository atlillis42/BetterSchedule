using System;
using System.ComponentModel.DataAnnotations;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Organization-wide preferences that govern calendar display, booking policy, and UX defaults.
    /// Does not encode individual provider availability (see ProviderAvailability).
    /// APIs and UI consume these settings to determine defaults and enforcement.
    /// </summary>
    public class OrganizationSettings
    {
        /// <summary>Primary key and foreign key to Organization.</summary>
        [Key, Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to owning organization.</summary>
        public Organization Organization { get; set; } = default!;

        // --------------------------------------------------------------------
        // Booking windows / guardrails
        // --------------------------------------------------------------------

        /// <summary>
        /// Minimum lead time to create or reschedule a reservation, in minutes.
        /// Applies to Manager/Provider create/update and (optionally) to any future client self-reschedule endpoints.
        /// </summary>
        [Range(0, 10080)]
        public int MinLeadMinutes { get; set; } = 0;

        /// <summary>
        /// Hours before start after which a reservation cannot be modified or canceled without an override.
        /// Default 24h is typical for service scheduling.
        /// </summary>
        [Range(0, 168)]
        public int CancelWindowHours { get; set; } = 24;

        /// <summary>
        /// Organization policy controlling whether providers may cancel their own reservations.
        /// Managers may still override in controller logic.
        /// </summary>
        [Required]
        public ProviderCancelPolicy ProviderCancelPolicy { get; set; } = ProviderCancelPolicy.AnyTime;

        /// <summary>
        /// Organization policy controlling whether clients may cancel their own reservations.
        /// NOTE: If <see cref="ProviderCancelPolicy"/> is <c>None</c>, clients are implicitly disallowed regardless of this value.
        /// </summary>
        [Required]
        public ClientCancelPolicy ClientCancelPolicy { get; set; } = ClientCancelPolicy.RespectWindow;

        // --------------------------------------------------------------------
        // Calendar display preferences (UI only)
        // --------------------------------------------------------------------

        /// <summary>Whether weekend columns are shown by default in calendar views.</summary>
        public bool ShowWeekends { get; set; } = true;

        /// <summary>First day of week for week/month views. 0 = Sunday, 1 = Monday, etc.</summary>
        [Range(0, 6)]
        public int StartOfWeek { get; set; } = 1;

        /// <summary>Start of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursStartLocal { get; set; } = new(8, 0, 0);

        /// <summary>End of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursEndLocal { get; set; } = new(18, 0, 0);

        /// <summary>Organization default calendar view for new sessions (users may override per preference).</summary>
        public DefaultCalendarView DefaultView { get; set; } = DefaultCalendarView.WorkWeek;

        // --------------------------------------------------------------------
        // Availability visualization + enforcement policy
        // --------------------------------------------------------------------

        /// <summary>Background shading mode used in the calendar UI.</summary>
        public CalendarShadingMode ShadingMode { get; set; } = CalendarShadingMode.ProviderAvailability;

        /// <summary>Server-side strictness for enforcing provider availability during create/update.</summary>
        public AvailabilityEnforcement AvailabilityEnforcement { get; set; } =
            AvailabilityEnforcement.BlockProvidersWarnManagers;

        /// <summary>Require an explicit override confirmation when violating availability or lead/cancel windows.</summary>
        public bool RequireConfirmOnOverrides { get; set; } = true;

        /// <summary>Whether provider availability is visible to all roles in the organization (read-only).</summary>
        public bool AvailabilityPublic { get; set; } = true;

        /// <summary>Whether providers can edit their own availability; managers can always edit.</summary>
        public bool ProvidersCanEditOwnAvailability { get; set; } = true;

        // --------------------------------------------------------------------
        // Access control / scoping
        // --------------------------------------------------------------------

        /// <summary>If true, providers can only view/book resources granted via ProviderResourceAccess. Managers always see all resources.</summary>
        public bool LimitProvidersToAssignedResources { get; set; } = false;

        /// <summary>Behavior when a provider has no ProviderResourceAccess rows: true = unrestricted (fail-open); false = no access (strict).</summary>
        public bool FailOpenWhenNoResourceAssignments { get; set; } = true;

        /// <summary>If true, providers can only use appointment types granted via ProviderAppointmentTypeAccess or ones they created. Managers see all.</summary>
        public bool LimitProvidersToAssignedAppointmentTypes { get; set; } = false;

        /// <summary>Behavior when a provider has no ProviderAppointmentTypeAccess rows: true = unrestricted (fail-open); false = no access (strict).</summary>
        public bool FailOpenWhenNoTypeAssignments { get; set; } = true;

        /// <summary>
        /// Enforce appointment type to resource constraints.
        /// - If an AppointmentType sets AssignedResourceId, require that resource unless a manager overrides.
        /// - If AppointmentTypeResourceAccess rows exist for the type, the selected resource must belong to that set.
        /// </summary>
        public bool EnforceAppointmentTypeResourceRules { get; set; } = false;

        // --------------------------------------------------------------------
        // Timezone & locale
        // --------------------------------------------------------------------

        /// <summary>IANA time zone identifier used as the default organization time zone for display and local-time rules.</summary>
        [Required, MaxLength(64)]
        public string TimeZoneId { get; set; } = "America/New_York";

        /// <summary>UI/formatting locale (e.g., "en-US").</summary>
        [MaxLength(16)]
        public string Locale { get; set; } = "en-US";

        // --------------------------------------------------------------------
        // Notifications (toggles; pipelines implemented later)
        // --------------------------------------------------------------------

        /// <summary>Enable email notifications for booking events.</summary>
        public bool EmailEnabled { get; set; } = false;

        /// <summary>Enable SMS notifications for booking events.</summary>
        public bool SmsEnabled { get; set; } = false;

        /// <summary>Send a confirmation after a booking is created.</summary>
        public bool SendBookingConfirmation { get; set; } = false;

        /// <summary>If set, send a reminder this many hours before start.</summary>
        public int? ReminderHoursBefore { get; set; } = null;

        // Future toggles (placeholders) ...
    }
}
