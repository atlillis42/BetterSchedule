using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class AppointmentType
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public TimeSpan Duration { get; set; }
        public decimal Price { get; set; } = 0;
        public string? Description { get; set; }

        [Required]
        public string CreatedByUserId { get; set; }  // FK to ApplicationUser
        public ApplicationUser CreatedByUser { get; set; }

        public int? AssignedLocationId { get; set; }
        public CalendarResource? AssignedLocation { get; set; }

        public bool IsPublic { get; set; } = true;
        public bool RequiresWaiver { get; set; } = false;
        public bool IsDeleted { get; set; } = false; // Soft delete

        [Required]
        public string OrganizationId { get; set; }
        public Organization Organization { get; set; }
    }
}
