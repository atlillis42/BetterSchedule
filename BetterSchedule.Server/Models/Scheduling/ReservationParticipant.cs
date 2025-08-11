using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class ReservationParticipant
    {
        public int Id { get; set; }

        [Required]
        public int ReservationId { get; set; }

        public Reservation Reservation { get; set; }

        [Required]
        public string UserId { get; set; } // FK to ApplicationUser

        [Required]
        public ReservationParticipantRole Role { get; set; } = ReservationParticipantRole.Client;

        [Required]
        public string OrganizationId { get; set; }
        public Organization Organization { get; set; }
    }

    public enum ReservationParticipantRole
    {
        Client,
        ServiceProvider,
        Guest
    }
}
