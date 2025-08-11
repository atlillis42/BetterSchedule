using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public sealed record CalendarResourceDto
    {
        public int Id { get; init; }
        [Required]
        public string OrganizationId { get; set; }
        [Required]
        public string Name { get; init; } = default!;
        public string? BackColor { get; init; } = default!;
        public List<BlockedTimeDto> BlockedTimes { get; init; } = new();
    }
}
