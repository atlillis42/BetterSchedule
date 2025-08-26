namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>Assignment with enriched catalog fields for the UI.</summary>
    public sealed class PackageAssignmentDto
    {
        public int Id { get; set; }
        public string OrganizationId { get; set; } = default!;
        public string ClientId { get; set; } = default!;
        public int PackageId { get; set; }

        // Mutable / lifecycle
        public int RemainingUses { get; set; }
        public DateTimeOffset GrantedAt { get; set; }
        public DateTimeOffset? ExpiresAtUtc { get; set; }
        public bool IsDeleted { get; set; }

        // Enriched from Package (join)
        public string PackageName { get; set; } = string.Empty;
        public int AppointmentTypeId { get; set; }
        public int TotalUses { get; set; }
        public bool ProviderLocked { get; set; }
        public string? ProviderId { get; set; }
    }

    /// <summary>Grant a package to a client.</summary>
    public sealed class GrantPackageDto
    {
        public string ClientId { get; set; } = default!;
        public int PackageId { get; set; }
    }
}
