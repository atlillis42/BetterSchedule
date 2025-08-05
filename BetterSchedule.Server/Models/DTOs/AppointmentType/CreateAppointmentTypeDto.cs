using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class CreateAppointmentTypeDto
    {
        [Required]
        public string Name { get; init; }
        [Required]
        public TimeSpan Duration { get; init; }
        public decimal? Price { get; init; }
        public string? Description { get; init; }
        [Required]
        public string CreatedByUserId { get; init; }
        public string? AssignedLocationId { get; init; }
        public bool IsPublic { get; init; }
        public bool RequiresWaiver { get; init; }
    }
}
