using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ReservationParticipant
{
    /// <summary>
    /// Read model for a participant attached to a reservation: either a user-backed participant (client/provider) or a named guest.
    /// </summary>
    public class ReservationParticipantDto
    {
        /// <summary>Identifier of the participant row.</summary>
        [Required]
        public int Id { get; init; }

        /// <summary>Identifier of the parent reservation.</summary>
        [Required]
        public int ReservationId { get; init; }

        /// <summary>
        /// Identifier of the participant user, if applicable (Client/ServiceProvider roles).
        /// Null for a guest participant.
        /// </summary>
        public string? UserId { get; init; }

        /// <summary>Guest display name when the participant is not a user.</summary>
        [MaxLength(200)]
        public string? GuestName { get; init; }

        /// <summary>Guest phone number when the participant is not a user.</summary>
        [Phone, MaxLength(40)]
        public string? GuestPhone { get; init; }

        /// <summary>Participant role as a string: "Client", "ServiceProvider", or "Guest".</summary>
        [Required]
        public string Role { get; init; } = default!;

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

        /// <summary>Whether this participant row is soft deleted.</summary>
        [Required]
        public bool IsDeleted { get; init; }
    }
}
