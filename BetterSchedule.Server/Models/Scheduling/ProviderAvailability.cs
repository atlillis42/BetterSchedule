using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Scheduling
{
    public class ProviderAvailability
    {
        public int Id { get; set; }

        [Required]
        public string OrganizationId { get; set; } = default!;
        public Organization Organization { get; set; } = default!;

        [Required]
        public string ServiceProviderId { get; set; } = default!;
        public ApplicationUser ServiceProvider { get; set; } = default!;

        [Required]
        public DayOfWeek DayOfWeek { get; set; }

        // Local clock times (org/user TZ), not UTC
        [Required]
        public TimeSpan StartLocalTime { get; set; }

        [Required]
        public TimeSpan EndLocalTime { get; set; }

        // Active date window for this weekly rule
        [Required]
        public DateOnly EffectiveFrom { get; set; }

        [Required]
        public DateOnly EffectiveTo { get; set; }

        public bool IsDeleted { get; set; } = false;
    }
}