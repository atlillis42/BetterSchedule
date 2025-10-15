using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>
    /// Read model for <see cref="BetterSchedule.Server.Models.Tenant.OrganizationSettings"/>.
    /// Only durable org-wide settings are exposed.
    /// </summary>
    public sealed class OrgSettingsDto
    {
        /// <summary>Minimum lead time to create or reschedule a reservation, in minutes.</summary>
        public int MinLeadMinutes { get; init; }

        /// <summary>Hours before start used to classify a client cancellation as "late".</summary>
        public int CancelWindowHours { get; init; }

        /// <summary>Start of organization business hours, in local org time ("HH:mm:ss").</summary>
        [Required]
        public string BusinessHoursStartLocal { get; init; } = "08:00:00";

        /// <summary>End of organization business hours, in local org time ("HH:mm:ss").</summary>
        [Required]
        public string BusinessHoursEndLocal { get; init; } = "18:00:00";

        /// <summary>Require explicit confirmation when performing an override.</summary>
        public bool RequireConfirmOnOverrides { get; init; }

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