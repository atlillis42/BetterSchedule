using BetterSchedule.Server.Models.DTOs.BlockedTime;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.CalendarResource
{
    /// <summary>
    /// Read model for an organization-scoped schedulable resource (e.g., room, chair, equipment),
    /// including optional UI color and associated blocked times.
    /// </summary>
    public class CalendarResourceDto
    {
        /// <summary>Identifier of the resource.</summary>
        public int Id { get; init; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

        /// <summary>Display name of the resource.</summary>
        [Required]
        public string Name { get; init; } = default!;

        /// <summary>Optional CSS hex color (e.g., "#d0d0d0") used when rendering this resource.</summary>
        public string? BackColor { get; init; } = default!;

        /// <summary>Blackout windows associated with this resource.</summary>
        public List<BlockedTimeDto> BlockedTimes { get; init; } = new();

        /// <summary>Whether this resource is soft deleted.</summary>
        public bool IsDeleted { get; init; } = false;
    }
}
