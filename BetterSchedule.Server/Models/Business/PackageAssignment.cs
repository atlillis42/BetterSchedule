using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business
{
    /// <summary>
    /// Grants a package to a client, capturing a snapshot of key package fields and tracking remaining uses and expiry.
    /// </summary>
    public class PackageAssignment : IValidatableObject
    {
        /// <summary>Unique identifier for the assignment.</summary>
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

        /// <summary>Snapshot of the package name at grant time.</summary>
        [Required, MaxLength(200)]
        public string PackageName { get; set; } = default!;

        /// <summary>Snapshot of the appointment type the package applies to.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }

        /// <summary>Snapshot of the total uses granted by the package.</summary>
        [Required, Range(1, int.MaxValue)]
        public int TotalUses { get; set; }

        /// <summary>Remaining uses available to the client.</summary>
        [Required, Range(0, int.MaxValue)]
        public int RemainingUses { get; set; }

        /// <summary>Snapshot of whether the package is provider-locked.</summary>
        [Required]
        public bool ProviderLocked { get; set; }

        /// <summary>Provider identifier when the package is provider-locked.</summary>
        public string? ProviderId { get; set; }

        /// <summary>Timestamp the package was granted (UTC).</summary>
        [Required]
        public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;

        /// <summary>Absolute expiry timestamp (UTC), if the grant expires.</summary>
        public DateTimeOffset? ExpiresAtUtc { get; set; }

        /// <summary>Whether this assignment is soft deleted.</summary>
        [Required]
        public bool IsDeleted { get; set; } = false;

        /// <summary>Validates consistency between snapshots and counters.</summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (ProviderLocked && string.IsNullOrWhiteSpace(ProviderId))
            {
                yield return new ValidationResult(
                    "ProviderId is required when ProviderLocked is true.",
                    new[] { nameof(ProviderId), nameof(ProviderLocked) });
            }

            if (RemainingUses > TotalUses)
            {
                yield return new ValidationResult(
                    "RemainingUses cannot exceed TotalUses.",
                    new[] { nameof(RemainingUses), nameof(TotalUses) });
            }
        }
    }
}
