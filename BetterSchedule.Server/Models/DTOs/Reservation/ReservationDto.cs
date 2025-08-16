using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class ReservationDto
    {
        [Required]
        public string OrganizationId { get; init; } = default!;

        [Required]
        public int Id { get; init; }

        [Required]
        public string ClientId { get; init; } = default!;

        [Required]
        public string ServiceProviderId { get; init; } = default!;

        [Required]
        public int AppointmentTypeId { get; init; }

        [Required]
        public DateTimeOffset StartTime { get; init; }

        [Required]
        public DateTimeOffset EndTime { get; init; }

        public int? ResourceId { get; init; }
        public int? PackageAssignmentId { get; init; }

        [Required]
        public string Status { get; init; } = default!;

        public string? Notes { get; init; }

        [Required]
        public DateTimeOffset CreatedAt { get; init; }

        public DateTimeOffset? UpdatedAt { get; init; }

        [Required]
        public bool IsDeleted { get; init; }

        public IEnumerable<ReservationParticipantDto> Participants { get; init; } = Array
            .Empty<ReservationParticipantDto>();
    }

}
