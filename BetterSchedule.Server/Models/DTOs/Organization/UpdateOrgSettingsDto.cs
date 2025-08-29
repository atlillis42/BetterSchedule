using System;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Write model for updating organization settings. Fields are optional; only provided values are applied.
    /// Enum values are supplied by name (case-insensitive). Time-of-day fields use <see cref="TimeSpan"/>.
    /// </summary>
    public sealed class UpdateOrgSettingsDto
    {
        // Booking windows (authoritative)
        /// <summary>Minimum lead time to create or reschedule a reservation, in minutes.</summary>
        public int? MinLeadMinutes { get; init; }

        /// <summary>Hours before start after which a reservation cannot be modified or canceled without an override.</summary>
        public int? CancelWindowHours { get; init; }

        // Calendar display
        /// <summary>Whether weekend columns are shown by default.</summary>
        public bool? ShowWeekends { get; init; }

        /// <summary>First day of week for week/month views: 0..6.</summary>
        public int? StartOfWeek { get; init; }

        /// <summary>New start of organization business hours (interpreted in the org time zone).</summary>
        public TimeSpan? BusinessHoursStartLocal { get; init; }

        /// <summary>New end of organization business hours (interpreted in the org time zone).</summary>
        public TimeSpan? BusinessHoursEndLocal { get; init; }

        /// <summary>New default calendar view (Day | Week | Month | Resources).</summary>
        public string? DefaultView { get; init; }

        // Availability policy & visuals
        /// <summary>New shading mode (None | OrgBusinessHours | ProviderAvailability).</summary>
        public string? ShadingMode { get; init; }

        /// <summary>New enforcement level (None | Warn | BlockProvidersWarnManagers | BlockAllRequireOverride).</summary>
        public string? AvailabilityEnforcement { get; init; }

        /// <summary>Whether to require explicit confirmation when performing an override.</summary>
        public bool? RequireConfirmOnOverrides { get; init; }

        /// <summary>Whether provider availability is visible to all roles.</summary>
        public bool? AvailabilityPublic { get; init; }

        /// <summary>Whether providers can edit their own availability.</summary>
        public bool? ProvidersCanEditOwnAvailability { get; init; }

        // Locale / timezone
        /// <summary>New IANA time zone identifier.</summary>
        public string? TimeZoneId { get; init; }

        /// <summary>New UI/formatting locale (e.g., "en-US").</summary>
        public string? Locale { get; init; }

        // Notifications
        /// <summary>Enable/disable email notifications for booking events.</summary>
        public bool? EmailEnabled { get; init; }

        /// <summary>Enable/disable SMS notifications for booking events.</summary>
        public bool? SmsEnabled { get; init; }

        /// <summary>Enable/disable sending a confirmation after a booking is created.</summary>
        public bool? SendBookingConfirmation { get; init; }

        /// <summary>New reminder offset, in hours before start.</summary>
        public int? ReminderHoursBefore { get; init; }
    }
}
