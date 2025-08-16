using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class ReservationParticipant
    {
        public int Id { get; set; }

        [Required]
        public int ReservationId { get; set; }
        public Reservation Reservation { get; set; } = default!;

        // For Client/ServiceProvider participants
        public string? UserId { get; set; }
        public ApplicationUser? User { get; set; }

        // For Guest participants
        [MaxLength(200)]
        public string? GuestName { get; set; }

        [Phone, MaxLength(40)]
        public string? GuestPhone { get; set; }

        [Required]
        public ReservationParticipantRole Role { get; set; } = ReservationParticipantRole.Client;

        public bool IsDeleted { get; set; } = false;

        [Required]
        public string OrganizationId { get; set; } = default!;
        public Organization Organization { get; set; } = default!;
    }

    public enum ReservationParticipantRole
    {
        Client,
        ServiceProvider,
        Guest
    }
}