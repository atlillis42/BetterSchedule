namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class ReservationDto
    {
        public int Id { get; set; }
        public string ClientId { get; set; }
        public string ServiceProviderId { get; set; }
        public int AppointmentTypeId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? LocationId { get; set; }
        public int? PackageAssignmentId { get; set; }
        public string Status { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }
}
