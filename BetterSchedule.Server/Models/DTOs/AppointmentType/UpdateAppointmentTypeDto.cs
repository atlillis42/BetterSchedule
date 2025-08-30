using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    /// <summary>
    /// Payload to update an existing appointment type. 
    /// Provide only fields to change.
    /// </summary>
    public class UpdateAppointmentTypeDto
    {

        /// <summary>New display name, if changing.</summary>
        public string? Name { get; init; }

        /// <summary>New scheduled length, if changing.</summary>
        public TimeSpan? Duration { get; init; }

        /// <summary>New price in major currency units, if changing.</summary>
        public decimal? Price { get; init; }

        /// <summary>New description, if changing.</summary>
        public string? Description { get; init; }

        /// <summary>New visibility flag, if changing.</summary>
        public bool? IsPublic { get; init; }

        /// <summary>New waiver requirement flag, if changing.</summary>
        public bool? RequiresWaiver { get; init; }

        /// <summary>New assigned resource identifier, if changing.</summary>
        public int? AssignedResourceId { get; init; }
        /// <summary>When true, clears any assigned resource.</summary>
        public bool? ClearAssignedResource { get; init; }
    }
}
