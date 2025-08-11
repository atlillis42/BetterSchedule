namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class UpdateReservationDto
    {
        public string? Notes { get; init; }
        public DateTimeOffset? StartTime { get; init; }
        public DateTimeOffset? EndTime { get; init; }
        public string? Status { get; init; }
        public string? LocationId { get; init; }
        public int? PackageAssignmentId { get; init; }

    }
}
 