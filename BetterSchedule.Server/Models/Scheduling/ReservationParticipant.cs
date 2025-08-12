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

        [Required]
        public string UserId { get; set; } = default!; // FK to ApplicationUser

        [Required]
        public ReservationParticipantRole Role { get; set; } = ReservationParticipantRole.Client;

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
