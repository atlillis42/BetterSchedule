using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class BlockedTime
    {
        public int Id { get; set; }
        [Required]
        public string? Reason { get; set; } = default!;
        [Required]
        public DateTimeOffset StartTime { get; set; }
        [Required]
        public DateTimeOffset EndTime { get; set; }
        public int? ResourceId { get; set; }
        public CalendarResource? Resource { get; set; }
        public string? BackColor { get; set; } = "#3a87ad";
        public bool IsDeleted { get; set; } = false;
        [Required]
        public string OrganizationId { get; set; } = default!;
        public Organization Organization { get; set; } = default!;
    }
}
