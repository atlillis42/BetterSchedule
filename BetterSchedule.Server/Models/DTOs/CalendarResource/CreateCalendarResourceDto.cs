using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.CalendarResource
{
    /// <summary>
    /// Payload to create a new resource with optional UI color.
    /// </summary>
    public class CreateCalendarResourceDto
    {
        /// <summary>Display name of the resource.</summary>
        [Required]
        public string Name { get; init; } = default!;

        /// <summary>Optional CSS hex color (e.g., "#d0d0d0") used when rendering this resource.</summary>
        public string? BackColor { get; init; }
    }
}
