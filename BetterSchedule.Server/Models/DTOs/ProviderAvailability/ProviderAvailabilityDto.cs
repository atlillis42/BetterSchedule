using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    /// <summary>
    /// Read model for a weekly recurring availability rule for a service provider,
    /// interpreted in the organization time zone.
    /// </summary>
    public class ProviderAvailabilityDto
    {
        /// <summary>Identifier of the availability rule.</summary>
        [Required]
        public int Id { get; init; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; init; } = default!;

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

        /// <summary>Whether this rule is soft deleted.</summary>
        [Required]
        public bool IsDeleted { get; init; }
    }
}
