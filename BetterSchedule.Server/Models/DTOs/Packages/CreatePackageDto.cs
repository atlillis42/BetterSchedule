using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>Create payload for a new package.</summary>
    public sealed class CreatePackageDto
    {
        [Required]
        public string Name { get; set; } = default!;
        [Required]
        public int AppointmentTypeId { get; set; }
        [Required]
        public int TotalUses { get; set; }

        public bool ProviderLocked { get; set; }
        public string? ProviderId { get; set; }

        public int? ExpiresAfterDays { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
