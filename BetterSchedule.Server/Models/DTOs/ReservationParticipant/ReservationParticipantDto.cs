using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ReservationParticipant
{
    public class ReservationParticipantDto
    {
        [Required]
        public int Id { get; init; }

        [Required]
        public int ReservationId { get; init; }

        [Required]
        public string UserId { get; init; } = default!;
        public string? GuestName { get; init; }

        public string? GuestPhone { get; init; }

        [Required]
        public string Role { get; init; } = default!;

        [Required]
        public string OrganizationId { get; init; } = default!;

        public bool IsDeleted { get; init; }
    }
}