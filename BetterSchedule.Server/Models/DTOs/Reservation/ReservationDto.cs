using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class ReservationDto
    {
        [Required]
        public string OrganizationId { get; set; }

        [Required]
        public int Id { get; init; }

        [Required]
        public string ClientId { get; init; }

        [Required]
        public string ServiceProviderId { get; init; }

        [Required]
        public int AppointmentTypeId { get; init; }

        [Required]
        public DateTimeOffset StartTime { get; init; }

        [Required]
        public DateTimeOffset EndTime { get; init; }

        public string? LocationId { get; init; }
        public int? PackageAssignmentId { get; init; }

        [Required]
        public string Status { get; init; } // If using enum, may want to change type

        public string? Notes { get; init; }

        [Required]
        public DateTimeOffset CreatedAt { get; init; }

        public DateTimeOffset? UpdatedAt { get; init; }

        [Required]
        public bool IsDeleted { get; init; }
    }

}
