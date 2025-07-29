using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class CreateAppointmentTypeDto
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public TimeSpan Duration { get; set; }
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        [Required]
        public string CreatedByUserId { get; set; }
        public string? AssignedLocationId { get; set; }
        public bool IsPublic { get; set; }
        public bool RequiresWaiver { get; set; }
    }
}
