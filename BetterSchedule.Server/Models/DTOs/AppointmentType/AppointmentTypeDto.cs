using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class AppointmentTypeDto
    {
        [Required]
        public int Id { get; init; }

        [Required]
        public string Name { get; init; } = string.Empty;

        [Required]
        public TimeSpan Duration { get; init; }

        public decimal Price { get; init; }
        public string? Description { get; init; }

        [Required]
        public string CreatedByUserId { get; init; } = default!;
        public string? CreatedByUserName { get; init; } 

        public int? AssignedResourceId { get; init; }
        public string? AssignedResourceName { get; init; } 

        public bool IsPublic { get; init; }
        public bool RequiresWaiver { get; init; }
        public bool IsDeleted { get; init; }

        [Required]
        public string OrganizationId { get; init; } = default!;
    }
}
