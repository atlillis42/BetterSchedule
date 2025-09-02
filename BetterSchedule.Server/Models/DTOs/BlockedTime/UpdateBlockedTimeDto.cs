using System;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>Payload to update a blocked time. Supply only fields to change.</summary>
    public class UpdateBlockedTimeDto
    {
        /// <summary>New reason.</summary>
        public string? Reason { get; init; }

        /// <summary>New start timestamp.</summary>
        public DateTimeOffset? StartTime { get; init; }

        /// <summary>New end timestamp (must be after start).</summary>
        public DateTimeOffset? EndTime { get; init; }

        /// <summary>New resource id; omit to leave unchanged.</summary>
        public int? ResourceId { get; init; }

        /// <summary>When true, clears the resource (becomes provider self-block for the creator).</summary>
        public bool? ClearResource { get; init; }

        /// <summary>Optional CSS hex color.</summary>
        public string? BackColor { get; init; }
    }
}
