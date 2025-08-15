using BetterSchedule.Server.Models.DTOs.BlockedTime;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.CalendarResource
{
    public class CalendarResourceDto
    {
        public int Id { get; init; }
        [Required]
        public string OrganizationId { get; init; } = default!;
        [Required]
        public string Name { get; init; } = default!;
        public string? BackColor { get; init; } = default!;
        public List<BlockedTimeDto> BlockedTimes { get; init; } = new();
        public bool IsDeleted { get; init; } = false;
    }
}
