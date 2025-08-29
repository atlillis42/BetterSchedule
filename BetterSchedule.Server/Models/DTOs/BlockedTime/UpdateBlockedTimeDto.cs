using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>
    /// Payload to update a blocked time window. All fields are required by this DTO shape.
    /// </summary>
    public class UpdateBlockedTimeDto
    {
        /// <summary>Reason shown to users for why this time is blocked.</summary>
        [Required]
        public string Reason { get; init; } = default!;

        /// <summary>Absolute start timestamp (UTC-capable) for the block window.</summary>
        [Required]
        public DateTimeOffset StartTime { get; init; }

        /// <summary>Absolute end timestamp (UTC-capable) for the block window.</summary>
        [Required]
        public DateTimeOffset EndTime { get; init; }

        /// <summary>Identifier of the affected resource, if the block targets a specific resource.</summary>
        public int? ResourceId { get; init; }

        /// <summary>Optional CSS hex color (e.g., "#3a87ad") used to render the block.</summary>
        public string? BackColor { get; init; }
    }
}
