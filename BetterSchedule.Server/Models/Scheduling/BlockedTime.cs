using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Organization-scoped blackout/hold window that prevents bookings during a specific time range.
    /// Stores absolute start/end instants as <see cref="System.DateTimeOffset"/> and supports an optional resource association.
    /// </summary>
    public class BlockedTime
    {
        /// <summary>Unique identifier for the blocked time entry.</summary>
        public int Id { get; set; }

        /// <summary>Reason shown to users for why this time is blocked.</summary>
        [Required]
        public string? Reason { get; set; } = default!;

        /// <summary>Absolute start timestamp (UTC-capable) for the block window.</summary>
        [Required]
        public DateTimeOffset StartTime { get; set; }

        /// <summary>Absolute end timestamp (UTC-capable) for the block window.</summary>
        [Required]
        public DateTimeOffset EndTime { get; set; }

        /// <summary>Identifier of the <see cref="ApplicationUser"/> who created this block.</summary>
        [Required]
        public string CreatedByUserId { get; set; } = default!;

        /// <summary>Navigation to the <see cref="ApplicationUser"/> who created this block.</summary>
        public ApplicationUser CreatedByUserName { get; set; } = default!;

        /// <summary>Identifier of the affected <see cref="CalendarResource"/>, if the block targets a specific resource.</summary>
        public int? ResourceId { get; set; }

        /// <summary>Navigation to the affected <see cref="CalendarResource"/>, if the block targets a specific resource.</summary>
        public CalendarResource? Resource { get; set; }

        /// <summary>Optional CSS hex color (e.g., "#3a87ad") used to render the block in calendar UI.</summary>
        public string? BackColor { get; set; } = "#3a87ad";

        /// <summary>Whether this block is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;
    }
}
