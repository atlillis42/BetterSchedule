using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ReservationParticipant
{
    public class AddReservationParticipantDto
    {
        // Required for Client/ServiceProvider; must be null for Guest
        public string? UserId { get; init; }

        [Required]
        public string Role { get; init; } = default!;

        // For Guest only
        public string? GuestName { get; init; }
        public string? GuestPhone { get; init; }
    }
}