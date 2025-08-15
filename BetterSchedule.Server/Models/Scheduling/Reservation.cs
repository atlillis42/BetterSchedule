using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class Reservation
    {
        public int Id { get; set; }

        [Required]
        public string ClientId { get; set; } = default!;    // FK to ApplicationUser
        public ApplicationUser Client { get; set; } = default!;

        [Required]
        public string ServiceProviderId { get; set; } = default!;   // FK to ApplicationUser
        public ApplicationUser ServiceProvider { get; set; } = default!;

        [Required]
        public int AppointmentTypeId { get; set; }    // FK to AppointmentType
        public AppointmentType AppointmentType { get; set; } = default!;

        [Required]
        public DateTimeOffset StartTime { get; set; }

        [Required]
        public DateTimeOffset EndTime { get; set; }

        public int? ResourceId { get; set; }

        public int? PackageAssignmentId { get; set; }

        public ReservationStatus Status { get; set; } = ReservationStatus.Booked;

        public string? Notes { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        [Required]
        public string OrganizationId { get; set; } = default!;
        public Organization Organization { get; set; } = default!;

        public bool IsDeleted { get; set; } = false; // Soft delete

        // List of all participants (useful for group appointments, additional providers, or client + guest(s))
        public List<ReservationParticipant> Participants { get; set; } = new();  

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

