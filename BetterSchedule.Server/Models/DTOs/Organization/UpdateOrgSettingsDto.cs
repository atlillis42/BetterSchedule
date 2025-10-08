namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Partial update model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Only provided fields are applied. String enums are case-insensitive.
    /// </summary>
    public sealed class UpdateOrgSettingsDto
    {

        /// <summary>New minimum lead time, in minutes.</summary>
        public int? MinLeadMinutes { get; init; }

        /// <summary>New cancel/modify window, in hours.</summary>
        public int? CancelWindowHours { get; init; }

        /// <summary>New provider cancel policy (AnyTime | RespectWindow | None).</summary>
        public string? ProviderCancelPolicy { get; init; }

        /// <summary>New client cancel policy (AnyTime | RespectWindow | None).</summary>
        public string? ClientCancelPolicy { get; init; }

        /// <summary>Toggle to show/hide weekend columns by default.</summary>
        public bool? ShowWeekends { get; init; }

        /// <summary>First day of the week (0..6).</summary>
        public int? StartOfWeek { get; init; }

        /// <summary>New business-hours start (local) in "HH:mm:ss".</summary>
        public string? BusinessHoursStartLocal { get; init; }

        /// <summary>New business-hours end (local) in "HH:mm:ss".</summary>
        public string? BusinessHoursEndLocal { get; init; }

        /// <summary>Default calendar view (Day | Week | WorkWeek | Month | Resources).</summary>
        public string? DefaultView { get; init; }

        /// <summary>Background shading mode (None | OrgBusinessHours | ProviderAvailability).</summary>
        public string? ShadingMode { get; init; }

        /// <summary>Availability enforcement level (None | Warn | BlockProvidersWarnManagers | BlockAllRequireOverride).</summary>
        public string? AvailabilityEnforcement { get; init; }

        /// <summary>Require explicit confirmation when performing an override.</summary>
        public bool? RequireConfirmOnOverrides { get; init; }

        /// <summary>Whether provider availability is visible to all roles.</summary>
        public bool? AvailabilityPublic { get; init; }

        /// <summary>Whether providers can edit their own availability.</summary>
        public bool? ProvidersCanEditOwnAvailability { get; init; }

        /// <summary>IANA time zone identifier.</summary>
        public string? TimeZoneId { get; init; }

        /// <summary>UI/formatting locale (e.g., "en-US").</summary>
        public string? Locale { get; init; }

        /// <summary>Enable email notifications for booking events.</summary>
        public bool? EmailEnabled { get; init; }

        /// <summary>Enable SMS notifications for booking events.</summary>
        public bool? SmsEnabled { get; init; }

        /// <summary>Send a confirmation after a booking is created.</summary>
        public bool? SendBookingConfirmation { get; init; }

        /// <summary>Reminder to send (hours before start), or <c>null</c> for none.</summary>
        public int? ReminderHoursBefore { get; init; }
    }
}
