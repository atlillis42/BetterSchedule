using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    public class UpdateProviderAvailabilityDto
    {
        // Validation in service layer
        public string? ServiceProviderId { get; init; }
        public DayOfWeek? DayOfWeek { get; init; }
        public TimeSpan? StartLocalTime { get; init; }
        public TimeSpan? EndLocalTime { get; init; }
        public DateOnly? EffectiveFrom { get; init; }
        public DateOnly? EffectiveTo { get; init; }
    }
}
