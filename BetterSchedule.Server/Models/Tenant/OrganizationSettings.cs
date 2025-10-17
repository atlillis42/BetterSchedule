using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Organization-wide preferences that govern calendar-related policy and durable defaults.
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
        /// Applies primarily to client booking flows; staff may override in controller logic.
        /// </summary>
        [Range(0, 10080)]
        public int MinLeadMinutes { get; set; } = 0;

        /// <summary>
        /// Hours before start used to classify a client cancellation as "late".
        /// Informational/status use; does not block cancellation by itself.
        /// </summary>
        [Range(0, 168)]
        public int CancelWindowHours { get; set; } = 24;


        /// <summary>
        /// When an override is taken (e.g., violating lead/cancel windows), require explicit confirmation.
        /// </summary>
        public bool RequireConfirmOnOverrides { get; set; } = true;

        // --------------------------------------------------------------------
        // Access control / scoping
        // --------------------------------------------------------------------

        /// <summary>
        /// If true, providers can only view/book resources granted via ProviderResourceAccess.
        /// Managers always see all resources.
        /// </summary>
        public bool LimitProvidersToAssignedResources { get; set; } = false;

        /// <summary>
        /// Behavior when a provider has no ProviderResourceAccess rows:
        /// true = unrestricted (fail-open); false = no access (strict).
        /// </summary>
        public bool FailOpenWhenNoResourceAssignments { get; set; } = true;

        /// <summary>
        /// If true, providers can only use appointment types granted via ProviderAppointmentTypeAccess or ones they created.
        /// Managers see all.
        /// </summary>
        public bool LimitProvidersToAssignedAppointmentTypes { get; set; } = false;

        /// <summary>
        /// Behavior when a provider has no ProviderAppointmentTypeAccess rows:
        /// true = unrestricted (fail-open); false = no access (strict).
        /// </summary>
        public bool FailOpenWhenNoTypeAssignments { get; set; } = true;

        /// <summary>
        /// Enforce appointment type to resource constraints.
        /// - If an AppointmentType sets AssignedResourceId, require that resource unless a manager overrides.
        /// - If AppointmentTypeResourceAccess rows exist for the type, the selected resource must belong to that set.
        /// </summary>
        public bool EnforceAppointmentTypeResourceRules { get; set; } = false;

        // --------------------------------------------------------------------
        // Business hours, timezone & locale
        // --------------------------------------------------------------------

        /// <summary>Start of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursStartLocal { get; set; } = new(8, 0, 0);

        /// <summary>End of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursEndLocal { get; set; } = new(18, 0, 0);

        /// <summary>
        /// Canonical IANA time zone identifier used as the default organization time zone
        /// for display and local-time rules (e.g., "America/New_York").
        /// </summary>
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
    }
}
