using System;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Partial update model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Provide only the fields to change. JSON converters ensure readable string wire formats.
    /// </summary>
    public sealed class UpdateOrgSettingsDto
    {
        // Booking windows
        public int? MinLeadMinutes { get; init; }
        public int? CancelWindowHours { get; init; }

        // Cancel policies
        public ProviderCancelPolicy? ProviderCancelPolicy { get; init; }
        public ClientCancelPolicy? ClientCancelPolicy { get; init; }

        // Calendar display
        public bool? ShowWeekends { get; init; }
        public int? StartOfWeek { get; init; }
        public TimeSpan? BusinessHoursStartLocal { get; init; }
        public TimeSpan? BusinessHoursEndLocal { get; init; }
        public DefaultCalendarView? DefaultView { get; init; }

        // Availability policy & visuals
        public CalendarShadingMode? ShadingMode { get; init; }
        public AvailabilityEnforcement? AvailabilityEnforcement { get; init; }
        public bool? RequireConfirmOnOverrides { get; init; }
        public bool? AvailabilityPublic { get; init; }
        public bool? ProvidersCanEditOwnAvailability { get; init; }

        // Timezone & locale
        public string? TimeZoneId { get; init; }
        public string? Locale { get; init; }

        // Notifications
        public bool? EmailEnabled { get; init; }
        public bool? SmsEnabled { get; init; }
        public bool? SendBookingConfirmation { get; init; }
        public int? ReminderHoursBefore { get; init; }
    }
}
