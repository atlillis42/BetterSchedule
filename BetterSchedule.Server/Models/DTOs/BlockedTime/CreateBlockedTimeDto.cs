using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>Payload to create a blocked time window.</summary>
    /// <remarks>Organization and creator are stamped from claims.</remarks>
    public class CreateBlockedTimeDto
    {
        /// <summary>Reason shown to users.</summary>
        [Required]
        public string Reason { get; init; } = default!;

        /// <summary>Absolute start timestamp.</summary>
        [Required]
        public DateTimeOffset StartTime { get; init; }

        /// <summary>Absolute end timestamp (must be after <see cref="StartTime"/>).</summary>
        [Required]
        public DateTimeOffset EndTime { get; init; }

        /// <summary>Target resource id, or null for a provider self-block.</summary>
        public int? ResourceId { get; init; }

        /// <summary>Optional CSS hex color (e.g., "#3a87ad").</summary>
        public string? BackColor { get; init; }

        public string? ProviderId { get; set; }
    }
}
