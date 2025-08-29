using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Organization-scoped definition of a bookable appointment offering (name, duration, price, and optional resource).
    /// Supports soft delete via <see cref="IsDeleted"/>.
    /// </summary>
    public class AppointmentType
    {
        /// <summary>Unique identifier for the appointment type.</summary>
        public int Id { get; set; }

        /// <summary>Display name of the appointment type.</summary>
        [Required]
        public string Name { get; set; } = string.Empty;

        /// <summary>Scheduled length of the appointment as a <see cref="System.TimeSpan"/>.</summary>
        [Required]
        public TimeSpan Duration { get; set; }

        /// <summary>Price for this appointment type in major currency units (e.g., USD).</summary>
        public decimal Price { get; set; } = 0;

        /// <summary>Optional description shown to users.</summary>
        public string? Description { get; set; }

        /// <summary>Identifier of the <see cref="ApplicationUser"/> who created this appointment type.</summary>
        [Required]
        public string CreatedByUserId { get; set; } = default!;

        /// <summary>Navigation to the <see cref="ApplicationUser"/> who created this appointment type.</summary>
        public ApplicationUser CreatedByUser { get; set; } = default!;

        /// <summary>Identifier of the assigned <see cref="CalendarResource"/> (if any).</summary>
        public int? AssignedResourceId { get; set; }

        /// <summary>
        /// Navigation to the assigned <see cref="CalendarResource"/> (if any).
        /// When <see cref="OrganizationSettings.EnforceAppointmentTypeResourceRules"/> is enabled and this is set,
        /// bookings must use this resource unless a manager override is applied.
        /// </summary>
        public CalendarResource? AssignedResource { get; set; }

        /// <summary>Whether the appointment type is visible to clients.</summary>
        public bool IsPublic { get; set; } = true;

        /// <summary>Whether a waiver is required for this appointment type.</summary>
        public bool RequiresWaiver { get; set; } = false;

        /// <summary>Whether this appointment type is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;
    }
}
