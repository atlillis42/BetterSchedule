using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    public class BlockedTimeDto
    {
        public int Id { get; init; }

        [Required]
        public string OrganizationId { get; init; } = default!;

        [Required]
        public string Reason { get; init; } = default!;

        [Required]
        public DateTimeOffset StartTime { get; init; }

        [Required]
        public DateTimeOffset EndTime { get; init; }

        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }

        [Required]
        public string CreatedByUserId { get; init; } = default!;
        public string? CreatedByUser { get; init; } 

        public bool IsDeleted { get; init; }
    }
}
