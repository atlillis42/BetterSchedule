namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class UpdateAppointmentTypeDto
    {
        public int Id { get; init; }
        public string? Name { get; init; }
        public TimeSpan? Duration { get; init; }
        public decimal? Price { get; init; }
        public string? Description { get; init; }
        public bool? IsPublic { get; init; }
        public bool? RequiresWaiver { get; init; }
        public bool? IsDeleted { get; init; }
        public string? AssignedLocationId { get; init; }
    }
}
