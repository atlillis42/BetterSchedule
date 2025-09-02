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

        /// <summary>Minimum lead time to create or reschedule a reservation, in minutes.</summary>
        public int MinLeadMinutes { get; init; }

        /// <summary>Hours before start after which a reservation cannot be modified or canceled without an override.</summary>
        public int CancelWindowHours { get; init; }

        /// <summary>Organization policy controlling whether providers may cancel their own reservations (AnyTime | RespectWindow | None).</summary>
        [Required]
        public string ProviderCancelPolicy { get; init; } = "AnyTime";

        /// <summary>Organization policy controlling whether clients may cancel their own reservations (AnyTime | RespectWindow | None).</summary>
        [Required]
        public string ClientCancelPolicy { get; init; } = "RespectWindow";

        /// <summary>Whether weekend columns are shown by default.</summary>
        public bool ShowWeekends { get; init; }

        /// <summary>First day of week for week/month views: 0 = Sunday, …, 6 = Saturday.</summary>
        public int StartOfWeek { get; init; }

        /// <summary>Start of organization business hours, interpreted in <see cref="TimeZoneId"/>. Serialized as "HH:mm:ss".</summary>
        [Required]
        public string BusinessHoursStartLocal { get; init; } = "08:00:00";

        /// <summary>End of organization business hours, interpreted in <see cref="TimeZoneId"/>. Serialized as "HH:mm:ss".</summary>
        [Required]
        public string BusinessHoursEndLocal { get; init; } = "18:00:00";

        /// <summary>Default calendar view (Day | Week | Month | Resources).</summary>
        [Required]
        public string DefaultView { get; init; } = "Week";

        /// <summary>Calendar shading mode (None | OrgBusinessHours | ProviderAvailability).</summary>
        [Required]
        public string ShadingMode { get; init; } = "ProviderAvailability";

        /// <summary>Availability enforcement level (None | Warn | BlockProvidersWarnManagers | BlockAllRequireOverride).</summary>
        [Required]
        public string AvailabilityEnforcement { get; init; } = "BlockProvidersWarnManagers";

        /// <summary>Require explicit confirmation when performing an override.</summary>
        public bool RequireConfirmOnOverrides { get; init; }

        /// <summary>Whether provider availability is visible to all roles.</summary>
        public bool AvailabilityPublic { get; init; }

        /// <summary>Whether providers can edit their own availability.</summary>
        public bool ProvidersCanEditOwnAvailability { get; init; }

        /// <summary>IANA time zone identifier used as the organization time zone.</summary>
        [Required, MaxLength(64)]
        public string TimeZoneId { get; init; } = "America/New_York";

        /// <summary>UI/formatting locale (e.g., "en-US").</summary>
        [MaxLength(16)]
        public string Locale { get; init; } = "en-US";

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
