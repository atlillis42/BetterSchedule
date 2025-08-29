using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    /// <summary>
    /// Payload to create a weekly recurring availability rule for a service provider.
    /// Local times are interpreted in the organization time zone.
    /// </summary>
    public class CreateProviderAvailabilityDto
    {
        /// <summary>Identifier of the service provider (<see cref="BetterSchedule.Server.Models.Identity.ApplicationUser"/>).</summary>
        [Required]
        public string ServiceProviderId { get; init; } = default!;

        /// <summary>Day of the week the rule applies to.</summary>
        [Required]
        public DayOfWeek DayOfWeek { get; init; }

        /// <summary>Local start time, interpreted in the organization time zone.</summary>
        [Required]
        public TimeSpan StartLocalTime { get; init; }

        /// <summary>Local end time, interpreted in the organization time zone.</summary>
        [Required]
        public TimeSpan EndLocalTime { get; init; }

        /// <summary>Start of the local-date range when this weekly rule is in effect.</summary>
        [Required]
        public DateOnly EffectiveFrom { get; init; }

        /// <summary>End of the local-date range when this weekly rule is in effect.</summary>
        [Required]
        public DateOnly EffectiveTo { get; init; }
    }
}
