using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.CalendarResource
{
    public class CreateCalendarResourceDto
    {
        [Required]
        public string Name { get; init; } = default!;
        public string? BackColor { get; init; }
    }
}
