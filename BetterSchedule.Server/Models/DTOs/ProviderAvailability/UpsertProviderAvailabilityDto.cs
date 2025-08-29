using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    /// <summary>
    /// Upsert payload for a provider availability rule. If <see cref="Id"/> is supplied,
    /// the entry with that identifier is updated (org-scoped). Otherwise, the service matches
    /// on the business key and inserts or undeletes as appropriate.
    /// </summary>
    /// <remarks>
    /// Typical business key: ServiceProviderId + DayOfWeek + EffectiveFrom + EffectiveTo.
    /// Local times are interpreted in the organization time zone.
    /// </remarks>
    public class UpsertProviderAvailabilityDto
    {
        /// <summary>Identifier of an existing availability rule to update, if targeting a specific row.</summary>
        public int? Id { get; init; }

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
