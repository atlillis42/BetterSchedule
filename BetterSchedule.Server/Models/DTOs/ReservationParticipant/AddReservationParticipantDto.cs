using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ReservationParticipant
{
    /// <summary>
    /// Payload to add a participant to a reservation. For user-backed roles supply <see cref="UserId"/>.
    /// For a guest, leave <see cref="UserId"/> null and provide guest details instead.
    /// </summary>
    public class AddReservationParticipantDto
    {
        /// <summary>
        /// Identifier of the participant user for Client/ServiceProvider roles.
        /// Must be null when adding a Guest.
        /// </summary>
        public string? UserId { get; init; }

        /// <summary>Participant role: "Client", "ServiceProvider", or "Guest".</summary>
        [Required]
        public string Role { get; init; } = default!;

        /// <summary>Guest display name when adding a guest participant.</summary>
        [MaxLength(200)]
        public string? GuestName { get; init; }

        /// <summary>Guest phone number when adding a guest participant.</summary>
        [Phone, MaxLength(40)]
        public string? GuestPhone { get; init; }
    }
}
