using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    /// <summary>
    /// Read model for an organization-scoped <see cref="BetterSchedule.Server.Models.Scheduling.AppointmentType"/>.
    /// Used by APIs and UI to display name, duration, pricing, and optional resource assignment.
    /// </summary>
    public class AppointmentTypeDto
    {
        /// <summary>Identifier of the appointment type.</summary>
        [Required]
        public int Id { get; init; }

        /// <summary>Display name of the appointment type.</summary>
        [Required]
        public string Name { get; init; } = string.Empty;

        /// <summary>Scheduled length as a <see cref="System.TimeSpan"/>.</summary>
        [Required]
        public TimeSpan Duration { get; init; }

        /// <summary>Price in major currency units (e.g., USD).</summary>
        public decimal Price { get; init; }

        /// <summary>Optional description shown to users.</summary>
        public string? Description { get; init; }

        /// <summary>Identifier of the user who created this appointment type.</summary>
        [Required]
        public string CreatedByUserId { get; init; } = default!;

        /// <summary>Display value for the creating user (e.g., name), if available.</summary>
        public string? CreatedByUserName { get; init; }

        /// <summary>Identifier of the assigned <see cref="BetterSchedule.Server.Models.Scheduling.CalendarResource"/>, if any.</summary>
        public int? AssignedResourceId { get; init; }

        /// <summary>Display name of the assigned resource, if any.</summary>
        public string? AssignedResourceName { get; init; }

        /// <summary>Whether the appointment type is visible to clients.</summary>
        public bool IsPublic { get; init; }

        /// <summary>Whether a waiver is required for this appointment type.</summary>
        public bool RequiresWaiver { get; init; }

        /// <summary>Whether this appointment type is soft deleted.</summary>
        public bool IsDeleted { get; init; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;
    }
}
