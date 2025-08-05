using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models
{
    public class BlockedTime
    {
        public int Id { get; set; }
        public string? Reason { get; set; } = default!;
        [Required]
        public DateTimeOffset StartTime { get; set; }
        [Required]
        public DateTimeOffset EndTime { get; set; }
        public int? ResourceId { get; set; }
        public string? BackColor { get; set; } = "#a3a87ad";
        public bool IsDeleted { get; set; } = false; // Soft delete

        public CalendarResource? Resource { get; set; }
    }
}
