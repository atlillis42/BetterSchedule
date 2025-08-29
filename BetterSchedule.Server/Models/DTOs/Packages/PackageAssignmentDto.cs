using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Read model for granting a package to a client, including snapshot fields and counters.
    /// Mirrors key fields of <see cref="BetterSchedule.Server.Models.Business.PackageAssignment"/>.
    /// </summary>
    public sealed class PackageAssignmentDto
    {
        /// <summary>Identifier of the assignment.</summary>
        [Required]
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Identifier of the client receiving the package.</summary>
        [Required]
        public string ClientId { get; set; } = default!;

        /// <summary>Identifier of the source package.</summary>
        [Required]
        public int PackageId { get; set; }

        // Mutable / lifecycle
        /// <summary>Remaining uses available to the client.</summary>
        [Required]
        public int RemainingUses { get; set; }

        /// <summary>Timestamp the package was granted (UTC).</summary>
        [Required]
        public DateTimeOffset GrantedAt { get; set; }

        /// <summary>Absolute expiry timestamp (UTC), if the grant expires.</summary>
        public DateTimeOffset? ExpiresAtUtc { get; set; }

        /// <summary>Whether this assignment is soft deleted.</summary>
        [Required]
        public bool IsDeleted { get; set; }

        // Enriched from Package (join)
        /// <summary>Snapshot of the package name at grant time.</summary>
        [Required]
        public string PackageName { get; set; } = string.Empty;

        /// <summary>Snapshot of the appointment type the package applies to.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }

        /// <summary>Snapshot of the total uses granted by the package.</summary>
        [Required]
        public int TotalUses { get; set; }

        /// <summary>Snapshot of whether the package is provider-locked.</summary>
        [Required]
        public bool ProviderLocked { get; set; }

        /// <summary>Provider identifier when the package is provider-locked.</summary>
        public string? ProviderId { get; set; }
    }
}
