namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class UpdateReservationDto
    {
        public string? ServiceProviderId { get; init; }
        public int? AppointmentTypeId { get; init; }

        public DateTimeOffset? StartTime { get; init; }
        public DateTimeOffset? EndTime { get; init; }
        
        public int? ResourceId { get; init; }
        public int? PackageAssignmentId { get; init; }
        public string? Notes { get; init; }

        // "Booked" | "Completed" | "Canceled" | "NoShow"
        public string? Status { get; init; }

    }
}
 