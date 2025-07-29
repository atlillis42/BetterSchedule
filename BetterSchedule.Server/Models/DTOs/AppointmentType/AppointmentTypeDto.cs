namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class AppointmentTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public TimeSpan Duration { get; set; }
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string CreatedByUserId { get; set; }
        public string? AssignedLocationId { get; set; }
        public bool IsPublic { get; set; }
        public bool RequiresWaiver { get; set; }
        public bool IsDeleted { get; set; }
    }
}
