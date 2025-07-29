using System.ComponentModel.DataAnnotations;
using BetterSchedule.Server.Models;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class Reservation
    {
        public int Id { get; set; }

        [Required]
        public string ClientId { get; set; }    // FK to ApplicationUser

        [Required]
        public string ServiceProviderId { get; set; }    // FK to ApplicationUser

        [Required]
        public int AppointmentTypeId { get; set; }    // FK to AppointmentType

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        public string? LocationId { get; set; }

        public int? PackageAssignmentId { get; set; }

        public ReservationStatus Status { get; set; } = ReservationStatus.Booked;

        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; } = false; // Soft delete

        // List of all participants (useful for group appointments, additional providers, or client + guest(s))
        //TODO: public List<ReservationParticipant> Participants { get; set; } = new();    // Uncomment later

        // TODO: public Guid? RecurrenceId { get; set; } // Uncomment for future recurring booking support
    }

    public enum ReservationStatus
    {
        Booked,
        Completed,
        Canceled,
        NoShow
    }
}

