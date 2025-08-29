using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// Weekly recurring availability rule for a service provider, interpreted in the organization time zone
    /// (<see cref="OrganizationSettings.TimeZoneId"/>). Applies within an effective date range. Supports soft delete.
    /// </summary>
    public class ProviderAvailability
    {
        /// <summary>Unique identifier for the availability rule.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning <see cref="Organization"/>.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the owning <see cref="Organization"/>.</summary>
        public Organization Organization { get; set; } = default!;

        /// <summary>Identifier of the <see cref="ApplicationUser"/> service provider.</summary>
        [Required]
        public string ServiceProviderId { get; set; } = default!;

        /// <summary>Navigation to the <see cref="ApplicationUser"/> service provider.</summary>
        public ApplicationUser ServiceProvider { get; set; } = default!;

        /// <summary>Day of the week the rule applies to.</summary>
        [Required]
        public DayOfWeek DayOfWeek { get; set; }

        /// <summary>Local start time for availability, interpreted in <see cref="OrganizationSettings.TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan StartLocalTime { get; set; }

        /// <summary>Local end time for availability, interpreted in <see cref="OrganizationSettings.TimeZoneId"/>.</summary>
        [Required]
        public TimeSpan EndLocalTime { get; set; }

        /// <summary>Start of the date range when this weekly rule is in effect.</summary>
        [Required]
        public DateOnly EffectiveFrom { get; set; }

        /// <summary>End of the date range when this weekly rule is in effect.</summary>
        [Required]
        public DateOnly EffectiveTo { get; set; }

        /// <summary>Whether this rule is soft deleted (hidden from normal queries).</summary>
        public bool IsDeleted { get; set; } = false;
    }
}
