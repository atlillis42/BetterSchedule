using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public sealed record BlockedTimeDto
    {
        public int Id { get; init; }
        [Required]
        public string OrganizationId { get; set; }
        [Required]
        public string Reason { get; init; } = default!;
        [Required]
        public DateTimeOffset StartTime { get; init; }
        [Required]
        public DateTimeOffset EndTime { get; init; }
        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
        public bool IsDeleted { get; init; }
    }
}
