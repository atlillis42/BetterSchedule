using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    public class UpdateBlockedTimeDto
    {
        [Required]
        public string Reason { get; init; } = default!;

        [Required]
        public DateTimeOffset StartTime { get; init; }

        [Required]
        public DateTimeOffset EndTime { get; init; }

        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
    }
}
