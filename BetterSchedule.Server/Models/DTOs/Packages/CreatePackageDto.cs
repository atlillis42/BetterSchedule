using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Create payload for a new package.
    /// </summary>
    public sealed class CreatePackageDto
    {
        /// <summary>Display name of the package.</summary>
        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        /// <summary>Identifier of the appointment type this package applies to.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }

        /// <summary>Total number of uses granted by the package.</summary>
        [Required, Range(1, int.MaxValue)]
        public int TotalUses { get; set; }

        /// <summary>Whether the package is restricted to a specific provider.</summary>
        [Required]
        public bool ProviderLocked { get; set; }

        /// <summary>Provider identifier when <see cref="ProviderLocked"/> is true.</summary>
        public string? ProviderId { get; set; }

        /// <summary>Relative expiry in days applied at grant time.</summary>
        [Range(1, 36500)]
        public int? ExpiresAfterDays { get; set; }

        /// <summary>Initial active state; defaults to true if omitted.</summary>
        public bool? IsActive { get; set; }
    }
}
