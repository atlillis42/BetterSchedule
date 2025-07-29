namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class UpdateReservationDto
    {
        public int Id { get; set; }
        public string? Notes { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? Status { get; set; }
        public string? LocationId { get; set; }
        public int? PackageAssignmentId { get; set; }
        // Add more fields if you want to support updating more properties
    }
}
