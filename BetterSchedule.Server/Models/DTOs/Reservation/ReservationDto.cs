namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class ReservationDto
    {
        public int Id { get; init; }
        public string ClientId { get; init; }
        public string ServiceProviderId { get; init; }
        public int AppointmentTypeId { get; init; }
        public DateTimeOffset StartTime { get; init; }
        public DateTimeOffset EndTime { get; init; }
        public string? LocationId { get; init; }
        public int? PackageAssignmentId { get; init; }
        public string Status { get; init; }
        public string? Notes { get; init; }
        public DateTimeOffset CreatedAt { get; init; }
        public DateTimeOffset? UpdatedAt { get; init; }
        public bool IsDeleted { get; init; }
    }
}
