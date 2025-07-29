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

        public decimal Price { get; set; }

        public string? Description { get; set; }

        [Required]
        public string CreatedByUserId { get; set; }  // FK to ApplicationUser

        public string? AssignedLocationId { get; set; }

        public bool IsPublic { get; set; } = true;

        public bool RequiresWaiver { get; set; } = false;

        public bool IsDeleted { get; set; } = false; // Soft delete

        // Future-proofing: add more fields as needed (e.g., CategoryId, BookingBuffer, etc)
    }
}
