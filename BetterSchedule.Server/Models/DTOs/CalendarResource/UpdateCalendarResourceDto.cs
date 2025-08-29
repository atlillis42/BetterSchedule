namespace BetterSchedule.Server.Models.DTOs.CalendarResource
{
    /// <summary>
    /// Payload to update an existing resource. Provide only the fields to change.
    /// </summary>
    public class UpdateCalendarResourceDto
    {
        /// <summary>New display name, if changing.</summary>
        public string? Name { get; init; }

        /// <summary>New CSS hex color (e.g., "#d0d0d0"), if changing.</summary>
        public string? BackColor { get; init; }
    }
}
