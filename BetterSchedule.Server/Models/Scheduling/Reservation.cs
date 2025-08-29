using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Organization-scoped booking between a client and a service provider for a specific <see cref="AppointmentType"/>,
    /// scheduled at absolute start/end instants and optionally associated to a <see cref="CalendarResource"/>.
    /// Tracks status, notes, audit timestamps, and participants. Supports soft delete.
    /// </summary>
    public class Reservation
    {
        /// <summary>Unique identifier for the reservation.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the client (<see cref="ApplicationUser"/>).</summary>
        [Required]
        public string ClientId { get; set; } = default!;    // FK to ApplicationUser

        /// <summary>Navigation to the client (<see cref="ApplicationUser"/>).</summary>
        public ApplicationUser Client { get; set; } = default!;

        /// <summary>Identifier of the service provider (<see cref="ApplicationUser"/>).</summary>
        [Required]
        public string ServiceProviderId { get; set; } = default!;   // FK to ApplicationUser

        /// <summary>Navigation to the service provider (<see cref="ApplicationUser"/>).</summary>
        public ApplicationUser ServiceProvider { get; set; } = default!;

        /// <summary>Identifier of the booked <see cref="AppointmentType"/>.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }    // FK to AppointmentType

        /// <summary>Navigation to the booked <see cref="AppointmentType"/>.</summary>
        public AppointmentType AppointmentType { get; set; } = default!;

        /// <summary>Absolute start timestamp (UTC-capable) of the reservation.</summary>
        [Required]
        public DateTimeOffset StartTime { get; set; }

        /// <summary>Absolute end timestamp (UTC-capable) of the reservation.</summary>
        [Required]
        public DateTimeOffset EndTime { get; set; }

        /// <summary>Identifier of the assigned <see cref="CalendarResource"/>, if the reservation uses a specific resource.</summary>
        public int? ResourceId { get; set; }

        /// <summary>Identifier of an associated package assignment, if the booking consumes package uses.</summary>
        public int? PackageAssignmentId { get; set; }

        /// <summary>Current lifecycle state of the reservation.</summary>
        public ReservationStatus Status { get; set; } = ReservationStatus.Booked;

        /// <summary>Optional notes visible to staff and/or clients, depending on UI policy.</summary>
        public string? Notes { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        /// <summary>Last update timestamp (UTC), if modified.</summary>
        public DateTimeOffset? UpdatedAt { get; set; }

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;

        /// <summary>Whether this reservation is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false; // Soft delete

        /// <summary>All participants for the booking (e.g., client + guests, additional providers).</summary>
        public List<ReservationParticipant> Participants { get; set; } = new();

        // TODO: public Guid? RecurrenceId { get; set; } // Uncomment for future recurring booking support
    }

    /// <summary>Lifecycle states for a reservation.</summary>
    public enum ReservationStatus
    {
        /// <summary>Scheduled and active.</summary>
        Booked,

        /// <summary>Completed as planned.</summary>
        Completed,

        /// <summary>Canceled before start.</summary>
        Canceled,

        /// <summary>Client did not attend.</summary>
        NoShow
    }
}
