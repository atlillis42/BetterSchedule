using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    /// <summary>
    /// Read model for an organization-scoped reservation between a client and a service provider
    /// for a specific appointment type, with absolute start/end timestamps and optional resource/package links.
    /// Includes late-cancel metadata when Status == "Canceled".
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
        public IEnumerable<ReservationParticipantDto> Participants { get; init; } = [];

        // ------------------------------
        // Cancellation metadata (read-only)
        // ------------------------------

        /// <summary>UTC timestamp when the reservation was canceled (if canceled).</summary>
        public DateTimeOffset? CancelledAt { get; init; }

        /// <summary>User ID who performed the cancellation, if applicable.</summary>
        public string? CancelledByUserId { get; init; }

        /// <summary>Free-form cancel reason (e.g., "ClientRequest", "StaffAction", "Weather").</summary>
        public string? CancelReason { get; init; }

        /// <summary>True if the cancelation occurred within the organization’s late-cancel window (with grace, if configured).</summary>
        public bool? IsLateCancel { get; init; }

        /// <summary>Origin of the cancel event (ClientPortal, Staff, System).</summary>
        public string? CancelSource { get; init; }
    }
}
