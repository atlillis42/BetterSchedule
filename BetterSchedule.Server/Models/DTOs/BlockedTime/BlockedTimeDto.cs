using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>Read model for a blocked time window.</summary>
    public class BlockedTimeDto
    {
        /// <summary>Identifier of the block.</summary>
        public int Id { get; init; }

        /// <summary>Owning organization id.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

        /// <summary>Reason shown to users.</summary>
        [Required]
        public string Reason { get; init; } = default!;

        /// <summary>Absolute start timestamp.</summary>
        [Required]
        public DateTimeOffset StartTime { get; init; }

        /// <summary>Absolute end timestamp.</summary>
        [Required]
        public DateTimeOffset EndTime { get; init; }

        /// <summary>Target resource id, or null for a provider self-block.</summary>
        public int? ResourceId { get; init; }

        /// <summary>Optional CSS hex color (e.g., "#3a87ad").</summary>
        public string? BackColor { get; init; }

        /// <summary>Creator user id.</summary>
        [Required]
        public string CreatedByUserId { get; init; } = default!;

        /// <summary>Creator display name, if available.</summary>
        public string? CreatedByUserName { get; init; }

        /// <summary>Soft-delete flag.</summary>
        public bool IsDeleted { get; init; }
    }
}
