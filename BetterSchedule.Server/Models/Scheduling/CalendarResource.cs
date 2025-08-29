using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Organization-scoped schedulable asset (e.g., room, chair, equipment) that can host reservations and blocks.
    /// Supports soft delete and optional UI color.
    /// </summary>
    public class CalendarResource
    {
        /// <summary>Unique identifier for the resource.</summary>
        public int Id { get; set; } = default!;

        /// <summary>Display name of the resource.</summary>
        [Required]
        public string Name { get; set; } = default!;

        /// <summary>Optional CSS hex color (e.g., "#d0d0d0") used when rendering this resource.</summary>
        public string? BackColor { get; set; } = "#d0d0d0";

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;

        /// <summary>Collection of blackout windows associated with this resource.</summary>
        public ICollection<BlockedTime> BlockedTimes { get; set; } = new List<BlockedTime>();

        /// <summary>Whether this resource is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false;
    }
}
