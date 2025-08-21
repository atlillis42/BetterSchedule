using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Read model for organization settings.
    /// Enums are exposed as strings for API clarity/compatibility.
    /// </summary>
    public sealed class OrgSettingsDto
    {
        // Booking windows
        public TimeSpan? BookingLeadTime { get; init; }
        public TimeSpan? CancellationWindow { get; init; }

        // Calendar display
        public bool ShowWeekends { get; init; }
        public int StartOfWeek { get; init; } // 0..6
        public TimeSpan BusinessHoursStartLocal { get; init; }
        public TimeSpan BusinessHoursEndLocal { get; init; }
        public string DefaultView { get; init; } = "Week"; // Day|Week|Month|Resources

        // Availability policy & visuals
        public string ShadingMode { get; init; } = "ProviderAvailability"; // None|OrgBusinessHours|ProviderAvailability
        public string AvailabilityEnforcement { get; init; } = "BlockProvidersWarnManagers"; // None|Warn|BlockProvidersWarnManagers|BlockAllRequireOverride
        public bool RequireConfirmOnOverrides { get; init; }
        public bool AvailabilityPublic { get; init; }
        public bool ProvidersCanEditOwnAvailability { get; init; }

        // Locale / timezone
        [Required, MaxLength(64)] public string TimeZoneId { get; init; } = "America/New_York";
        [MaxLength(16)] public string Locale { get; init; } = "en-US";

        // Notifications
        public bool EmailEnabled { get; init; }
        public bool SmsEnabled { get; init; }
        public bool SendBookingConfirmation { get; init; }
        public int? ReminderHoursBefore { get; init; }
    }
}
