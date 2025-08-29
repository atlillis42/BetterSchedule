using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>
    /// Payload to create a blocked time window with absolute start/end timestamps and optional resource.
    /// </summary>
    /// <remarks>
    /// Organization and creator are typically stamped server-side from claims.
    /// </remarks>
    public class CreateBlockedTimeDto
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
