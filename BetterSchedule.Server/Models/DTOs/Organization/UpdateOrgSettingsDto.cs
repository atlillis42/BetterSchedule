namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Partial update model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Only provided fields are applied.
    /// </summary>
    public sealed class UpdateOrgSettingsDto
    {
        /// <summary>New minimum lead time, in minutes.</summary>
        public int? MinLeadMinutes { get; init; }

        /// <summary>New cancel window, in hours (used for late-cancel classification).</summary>
        public int? CancelWindowHours { get; init; }

        /// <summary>New business-hours start (local) in "HH:mm:ss".</summary>
        public string? BusinessHoursStartLocal { get; init; }

        /// <summary>New business-hours end (local) in "HH:mm:ss".</summary>
        public string? BusinessHoursEndLocal { get; init; }

        /// <summary>Require explicit confirmation when performing an override.</summary>
        public bool? RequireConfirmOnOverrides { get; init; }

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