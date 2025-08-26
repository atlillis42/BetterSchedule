using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business;

public class Package : IValidatableObject
{
    public int Id { get; set; }

    [Required]
    public string OrganizationId { get; set; } = default!;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = default!;

    
    [Required]
    public int AppointmentTypeId { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int TotalUses { get; set; }

    // Optional provider lock
    [Required]
    public bool ProviderLocked { get; set; } = false;

    public string? ProviderId { get; set; }

    // Relative expiry (days) applied at grant time → becomes ExpiresAtUtc on assignment
    [Range(1, 36500)]
    public int? ExpiresAfterDays { get; set; }

    [Required]
    public bool IsActive { get; set; } = true;

    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

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
