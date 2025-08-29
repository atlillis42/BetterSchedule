using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Read model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Enum values are exposed as strings for API clarity/compatibility.
    /// </summary>
    public sealed class OrgSettingsDto
    {
        // Booking windows (authoritative)
        /// <summary>Minimum lead time to create or reschedule a reservation, in minutes.</summary>
        public int MinLeadMinutes { get; init; }

        /// <summary>Hours before start after which a reservation cannot be modified or canceled without an override.</summary>
        public int CancelWindowHours { get; init; }

        // Calendar display
        /// <summary>Whether weekend columns are shown by default.</summary>
        public bool ShowWeekends { get; init; }

        /// <summary>First day of week for week/month views: 0 = Sunday, …, 6 = Saturday.</summary>
        public int StartOfWeek { get; init; }

        /// <summary>Start of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        public TimeSpan BusinessHoursStartLocal { get; init; }

        /// <summary>End of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        public TimeSpan BusinessHoursEndLocal { get; init; }

        /// <summary>Default calendar view (Day | Week | Month | Resources).</summary>
        public string DefaultView { get; init; } = "Week";

        // Availability policy & visuals
        /// <summary>Calendar shading mode (None | OrgBusinessHours | ProviderAvailability).</summary>
        public string ShadingMode { get; init; } = "ProviderAvailability";

        /// <summary>Availability enforcement level (None | Warn | BlockProvidersWarnManagers | BlockAllRequireOverride).</summary>
        public string AvailabilityEnforcement { get; init; } = "BlockProvidersWarnManagers";

        /// <summary>Require explicit confirmation when performing an override.</summary>
        public bool RequireConfirmOnOverrides { get; init; }

        /// <summary>Whether provider availability is visible to all roles.</summary>
        public bool AvailabilityPublic { get; init; }

        /// <summary>Whether providers can edit their own availability.</summary>
        public bool ProvidersCanEditOwnAvailability { get; init; }

        // Locale / timezone
        /// <summary>IANA time zone identifier used as the organization time zone.</summary>
        [Required, MaxLength(64)]
        public string TimeZoneId { get; init; } = "America/New_York";

        /// <summary>UI/formatting locale (e.g., "en-US").</summary>
        [MaxLength(16)]
        public string Locale { get; init; } = "en-US";

        // Notifications
        /// <summary>Enable email notifications for booking events.</summary>
        public bool EmailEnabled { get; init; }

        /// <summary>Enable SMS notifications for booking events.</summary>
        public bool SmsEnabled { get; init; }

        /// <summary>Send a confirmation after a booking is created.</summary>
        public bool SendBookingConfirmation { get; init; }

        /// <summary>If set, send a reminder this many hours before start.</summary>
        public int? ReminderHoursBefore { get; init; }
    }
}
