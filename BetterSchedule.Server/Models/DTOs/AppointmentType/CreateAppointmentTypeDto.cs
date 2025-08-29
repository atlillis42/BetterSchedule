using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    /// <summary>
    /// Payload to create a new <see cref="BetterSchedule.Server.Models.Scheduling.AppointmentType"/>.
    /// </summary>
    public class CreateAppointmentTypeDto
    {
        /// <summary>Display name of the appointment type.</summary>
        [Required]
        public string Name { get; init; } = string.Empty;

        /// <summary>Scheduled length as a <see cref="TimeSpan"/>.</summary>
        [Required]
        public TimeSpan Duration { get; init; }

        /// <summary>Price in major currency units (e.g., USD).</summary>
        public decimal Price { get; init; } = 0;

        /// <summary>Optional description shown to users.</summary>
        public string? Description { get; init; }

        /// <summary>Identifier of the user creating this appointment type.</summary>
        [Required]
        public string CreatedByUserId { get; init; } = default!;

        /// <summary>Identifier of the assigned resource, if any.</summary>
        public int? AssignedResourceId { get; init; }

        /// <summary>Whether the appointment type is visible to clients.</summary>
        public bool IsPublic { get; init; }

        /// <summary>Whether a waiver is required for this appointment type.</summary>
        public bool RequiresWaiver { get; init; }
    }
}
