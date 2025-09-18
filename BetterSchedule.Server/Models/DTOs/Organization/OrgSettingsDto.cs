using System;
using System.ComponentModel.DataAnnotations;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Read model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Enums and time/date types are strongly typed; JSON converters format them as strings.
    /// </summary>
    public sealed class OrgSettingsDto
    {
        /// <summary>Minimum lead time to create or reschedule a reservation, in minutes.</summary>
        public int MinLeadMinutes { get; init; }

        /// <summary>Hours before start after which a reservation cannot be modified or canceled without an override.</summary>
        public int CancelWindowHours { get; init; }

        /// <summary>Organization policy controlling whether providers may cancel their own reservations.</summary>
        [Required]
        public ProviderCancelPolicy ProviderCancelPolicy { get; init; } = ProviderCancelPolicy.AnyTime;

        /// <summary>Organization policy controlling whether clients may cancel their own reservations.</summary>
        [Required]
        public ClientCancelPolicy ClientCancelPolicy { get; init; } = ClientCancelPolicy.RespectWindow;

        /// <summary>Whether weekend columns are shown by default.</summary>
        public bool ShowWeekends { get; init; }

        /// <summary>First day of week for week/month views: 0 = Sunday, …, 6 = Saturday.</summary>
        public int StartOfWeek { get; init; }

        /// <summary>Start of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursStartLocal { get; init; } = new(8, 0, 0);

        /// <summary>End of organization business hours, interpreted in <see cref="TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan BusinessHoursEndLocal { get; init; } = new(18, 0, 0);

        /// <summary>Default calendar view for new sessions.</summary>
        [Required]
        public DefaultCalendarView DefaultView { get; init; } = DefaultCalendarView.Week;

        /// <summary>Calendar background shading mode.</summary>
        [Required]
        public CalendarShadingMode ShadingMode { get; init; } = CalendarShadingMode.ProviderAvailability;

        /// <summary>Server-side enforcement level for provider availability checks.</summary>
        [Required]
        public AvailabilityEnforcement AvailabilityEnforcement { get; init; } = AvailabilityEnforcement.BlockProvidersWarnManagers;

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
