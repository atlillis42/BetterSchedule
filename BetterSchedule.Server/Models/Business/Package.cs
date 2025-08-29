using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business
{
    /// <summary>
    /// Organization-scoped product granting a fixed number of uses for a specific appointment type.
    /// May optionally be locked to a provider and can carry a relative expiry that is applied at assignment time.
    /// </summary>
    public class Package : IValidatableObject
    {
        /// <summary>Unique identifier for the package.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Display name of the package.</summary>
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = default!;

        /// <summary>Identifier of the appointment type this package applies to.</summary>
        [Required]
        public int AppointmentTypeId { get; set; }

        /// <summary>Total number of uses granted by the package.</summary>
        [Required]
        [Range(1, int.MaxValue)]
        public int TotalUses { get; set; }

        /// <summary>Whether the package is restricted to a specific provider.</summary>
        [Required]
        public bool ProviderLocked { get; set; } = false;

        /// <summary>Identifier of the provider when <see cref="ProviderLocked"/> is true.</summary>
        public string? ProviderId { get; set; }

        /// <summary>
        /// Relative expiry in days applied at grant time; the resulting absolute timestamp is stored on the assignment.
        /// </summary>
        [Range(1, 36500)]
        public int? ExpiresAfterDays { get; set; }

        /// <summary>Whether the package is active and available for assignment.</summary>
        [Required]
        public bool IsActive { get; set; } = true;

        /// <summary>Creation timestamp (UTC).</summary>
        [Required]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        /// <summary>
        /// Validates consistency between <see cref="ProviderLocked"/> and <see cref="ProviderId"/>.
        /// </summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (ProviderLocked && string.IsNullOrWhiteSpace(ProviderId))
            {
                yield return new ValidationResult(
                    "ProviderId is required when ProviderLocked is true.",
                    new[] { nameof(ProviderId), nameof(ProviderLocked) });
            }
        }
    }
}
