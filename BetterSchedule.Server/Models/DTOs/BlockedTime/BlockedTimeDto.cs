using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.BlockedTime
{
    /// <summary>
    /// Read model for an organization-scoped blocked time window with absolute start/end timestamps and optional resource.
    /// </summary>
    public class BlockedTimeDto
    {
        /// <summary>Identifier of the blocked time entry.</summary>
        public int Id { get; init; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

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

        /// <summary>Identifier of the user who created this block.</summary>
        [Required]
        public string CreatedByUserId { get; init; } = default!;

        /// <summary>Display value for the creating user (e.g., name), if available.</summary>
        public string? CreatedByUser { get; init; }

        /// <summary>Whether this block is soft deleted.</summary>
        public bool IsDeleted { get; init; }
    }
}
