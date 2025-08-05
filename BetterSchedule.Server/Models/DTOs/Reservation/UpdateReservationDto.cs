namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class UpdateReservationDto
    {
        public int Id { get; init; }
        public string? Notes { get; init; }
        public DateTime? StartTime { get; init; }
        public DateTime? EndTime { get; init; }
        public string? Status { get; init; }
        public string? LocationId { get; init; }
        public int? PackageAssignmentId { get; init; }
        // Add more fields if you want to support updating more properties
    }
}
