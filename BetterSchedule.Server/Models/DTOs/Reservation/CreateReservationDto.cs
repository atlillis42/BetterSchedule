using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    /// <summary>
    /// Payload to create a reservation for a client and service provider, with absolute start/end timestamps
    /// and optional resource/package links.
    /// </summary>
    public class CreateReservationDto
    {
        /// <summary>Identifier of the client user.</summary>
        [Required]
        public string ClientId { get; init; } = default!;

        /// <summary>Identifier of the service provider user.</summary>
        [Required]
        public string ServiceProviderId { get; init; } = default!;

        /// <summary>Identifier of the booked appointment type.</summary>
        [Required]
        public int AppointmentTypeId { get; init; }

        /// <summary>Absolute start timestamp (UTC-capable) of the reservation.</summary>
        [Required]
        public DateTimeOffset StartTime { get; init; }

        /// <summary>Absolute end timestamp (UTC-capable) of the reservation.</summary>
        [Required]
        public DateTimeOffset EndTime { get; init; }

        /// <summary>Identifier of the assigned resource, if any.</summary>
        public int? ResourceId { get; init; }

        /// <summary>Identifier of a related package assignment, if consumption applies.</summary>
        public int? PackageAssignmentId { get; init; }

        /// <summary>Optional notes associated with the reservation.</summary>
        public string? Notes { get; init; }
    }
}
