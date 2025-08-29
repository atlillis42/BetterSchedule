using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    /// <summary>
    /// Patch-style payload to update an existing weekly availability rule.
    /// Provide only the fields to change. Validation is enforced in the service layer.
    /// </summary>
    public class UpdateProviderAvailabilityDto
    {
        /// <summary>New service provider identifier, if changing.</summary>
        public string? ServiceProviderId { get; init; }

        /// <summary>New day of week, if changing.</summary>
        public DayOfWeek? DayOfWeek { get; init; }

        /// <summary>New local start time, if changing.</summary>
        public TimeSpan? StartLocalTime { get; init; }

        /// <summary>New local end time, if changing.</summary>
        public TimeSpan? EndLocalTime { get; init; }

        /// <summary>New local effective-from date, if changing.</summary>
        public DateOnly? EffectiveFrom { get; init; }

        /// <summary>New local effective-to date, if changing.</summary>
        public DateOnly? EffectiveTo { get; init; }
    }
}
