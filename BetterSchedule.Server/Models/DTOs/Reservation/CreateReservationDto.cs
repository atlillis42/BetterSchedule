using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class CreateReservationDto
    {
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
        public string? Notes { get; init; }
    }
}
