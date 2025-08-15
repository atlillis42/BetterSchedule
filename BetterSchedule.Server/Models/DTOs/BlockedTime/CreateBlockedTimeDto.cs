using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    // Org + CreatedBy are stamped server-side from claims.
    public class CreateBlockedTimeDto
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
