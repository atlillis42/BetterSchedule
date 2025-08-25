using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business;

public class PackageAssignment : IValidatableObject
{
    public int Id { get; set; }

    [Required]
    public string OrganizationId { get; set; } = default!;

    [Required]
    public string ClientId { get; set; } = default!;

    [Required]
    public int PackageId { get; set; }

    // Denormalized snapshot fields
    [Required, MaxLength(200)]
    public string PackageName { get; set; } = default!;

    [Required]
    public int AppointmentTypeId { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int TotalUses { get; set; }

    [Required, Range(0, int.MaxValue)]
    public int RemainingUses { get; set; }

    // Snapshot of provider lock from Package
    [Required]
    public bool ProviderLocked { get; set; }

    public string? ProviderId { get; set; }

    [Required]
    public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ExpiresAtUtc { get; set; }

    [Required]
    public bool IsDeleted { get; set; } = false;

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
