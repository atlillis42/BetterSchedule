using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    /// <summary>
    /// Read model for an organization-scoped reservation between a client and a service provider
    /// for a specific appointment type, with absolute start/end timestamps and optional resource/package links.
    /// </summary>
    public class ReservationDto
    {
        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

        /// <summary>Identifier of the reservation.</summary>
        [Required]
        public int Id { get; init; }

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

        /// <summary>
        /// Current lifecycle state as a string.
        /// One of: "Booked", "Completed", "Canceled", "NoShow".
        /// </summary>
        [Required]
        public string Status { get; init; } = default!;

        /// <summary>Optional notes associated with the reservation.</summary>
        public string? Notes { get; init; }

        /// <summary>Creation timestamp (UTC).</summary>
        [Required]
        public DateTimeOffset CreatedAt { get; init; }

        /// <summary>Last update timestamp (UTC), if modified.</summary>
        public DateTimeOffset? UpdatedAt { get; init; }

        /// <summary>Whether this reservation is soft deleted.</summary>
        [Required]
        public bool IsDeleted { get; init; }

        /// <summary>All participants for the booking (e.g., client + guests, additional providers).</summary>
        public IEnumerable<ReservationParticipantDto> Participants { get; init; } = Array.Empty<ReservationParticipantDto>();
    }
}
