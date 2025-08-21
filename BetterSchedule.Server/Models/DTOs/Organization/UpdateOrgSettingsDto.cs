using System;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Write model for updating org settings. Fields are optional; only provided values are applied.
    /// Enums are supplied by name (case-insensitive).
    /// Time-of-day fields use TimeSpan (JSON "HH:mm" is fine).
    /// </summary>
    public sealed class UpdateOrgSettingsDto
    {
        // Booking windows
        public TimeSpan? BookingLeadTime { get; init; }
        public TimeSpan? CancellationWindow { get; init; }

        // Calendar display
        public bool? ShowWeekends { get; init; }
        public int? StartOfWeek { get; init; } // Zero-based index, O to 6
        public TimeSpan? BusinessHoursStartLocal { get; init; }
        public TimeSpan? BusinessHoursEndLocal { get; init; }
        public string? DefaultView { get; init; } // Day|Week|Month|Resources

        // Availability policy & visuals
        public string? ShadingMode { get; init; } // None|OrgBusinessHours|ProviderAvailability
        public string? AvailabilityEnforcement { get; init; } // None|Warn|BlockProvidersWarnManagers|BlockAllRequireOverride
        public bool? RequireConfirmOnOverrides { get; init; }
        public bool? AvailabilityPublic { get; init; }
        public bool? ProvidersCanEditOwnAvailability { get; init; }

        // Locale / timezone
        public string? TimeZoneId { get; init; }
        public string? Locale { get; init; }

        // Notifications
        public bool? EmailEnabled { get; init; }
        public bool? SmsEnabled { get; init; }
        public bool? SendBookingConfirmation { get; init; }
        public int? ReminderHoursBefore { get; init; }
    }
}
