using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Patch-style update payload for a package. Provide only the fields to change.
    /// </summary>
    public sealed class UpdatePackageDto
    {
        /// <summary>New display name, if changing.</summary>
        [MaxLength(200)]
        public string? Name { get; set; }

        /// <summary>New appointment type identifier, if changing.</summary>
        public int? AppointmentTypeId { get; set; }

        /// <summary>New total uses, if changing.</summary>
        [Range(1, int.MaxValue)]
        public int? TotalUses { get; set; }

        /// <summary>New provider-locked flag, if changing.</summary>
        public bool? ProviderLocked { get; set; }

        /// <summary>New provider identifier (required when provider-locked is set true).</summary>
        public string? ProviderId { get; set; }

        /// <summary>New relative expiry in days, if changing.</summary>
        [Range(1, 36500)]
        public int? ExpiresAfterDays { get; set; }

        /// <summary>New active state, if changing.</summary>
        public bool? IsActive { get; set; }
    }
}
