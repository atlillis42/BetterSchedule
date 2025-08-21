using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    public class CreateProviderAvailabilityDto
    {
        [Required] public string ServiceProviderId { get; init; } = default!;
        [Required] public DayOfWeek DayOfWeek { get; init; }
        [Required] public TimeSpan StartLocalTime { get; init; }
        [Required] public TimeSpan EndLocalTime { get; init; }
        [Required] public DateOnly EffectiveFrom { get; init; }
        [Required] public DateOnly EffectiveTo { get; init; }
    }
}
