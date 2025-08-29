using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Participant attached to a <see cref="Reservation"/>: either a user (client or provider) or a named guest.
    /// Supports contact info for guests, role designation, and soft delete.
    /// </summary>
    public class ReservationParticipant
    {
        /// <summary>Unique identifier for the participant row.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the parent <see cref="Reservation"/>.</summary>
        [Required]
        public int ReservationId { get; set; }

        /// <summary>Navigation to the parent <see cref="Reservation"/>.</summary>
        public Reservation Reservation { get; set; } = default!;

        /// <summary>Identifier of the participant (<see cref="ApplicationUser"/>) for user-backed roles, if applicable.</summary>
        public string? UserId { get; set; }

        /// <summary>Navigation to the participant (<see cref="ApplicationUser"/>) for user-backed roles, if applicable.</summary>
        public ApplicationUser? User { get; set; }

        /// <summary>Guest display name when the participant is not a user.</summary>
        [MaxLength(200)]
        public string? GuestName { get; set; }

        /// <summary>Guest phone number when the participant is not a user.</summary>
        [Phone, MaxLength(40)]
        public string? GuestPhone { get; set; }

        /// <summary>Role this participant fulfills in the reservation.</summary>
        [Required]
        public ReservationParticipantRole Role { get; set; } = ReservationParticipantRole.Client;

        /// <summary>Whether this participant row is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;
    }

    /// <summary>Participant roles within a reservation.</summary>
    public enum ReservationParticipantRole
    {
        /// <summary>Primary client for the booking.</summary>
        Client,

        /// <summary>Service provider performing the appointment.</summary>
        ServiceProvider,

        /// <summary>Non-user guest attending the appointment.</summary>
        Guest
    }
}
