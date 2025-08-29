using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Read model for an organization-scoped package that grants a fixed number of uses for a specific appointment type.
    /// Mirrors key fields of <see cref="BetterSchedule.Server.Models.Business.Package"/>.
    /// </summary>
    public sealed class PackageDto
    {
        /// <summary>Identifier of the package.</summary>
        [Required]
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Display name of the package.</summary>
        [Required]
        public string Name { get; set; } = default!;

        /// <summary>Identifier of the appointment type this package applies to.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }

        /// <summary>Total number of uses granted by the package.</summary>
        [Required]
        public int TotalUses { get; set; }

        /// <summary>Whether the package is restricted to a specific provider.</summary>
        [Required]
        public bool ProviderLocked { get; set; }

        /// <summary>Provider identifier when the package is provider-locked.</summary>
        public string? ProviderId { get; set; }

        /// <summary>Relative expiry in days applied at grant time; becomes an absolute expiry on assignment.</summary>
        public int? ExpiresAfterDays { get; set; }

        /// <summary>Whether the package is active and available for assignment.</summary>
        [Required]
        public bool IsActive { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        [Required]
        public DateTimeOffset CreatedAt { get; set; }
    }
}
