namespace BetterSchedule.Server.Models.DTOs.Packages
{
    public sealed class PackageDto
    {
        public int Id { get; set; }
        public string OrganizationId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public int AppointmentTypeId { get; set; }
        public int TotalUses { get; set; }
        public bool ProviderLocked { get; set; }
        public string? ProviderId { get; set; }
        public int? ExpiresAfterDays { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public sealed class CreatePackageDto
    {
        public string Name { get; set; } = default!;
        public int AppointmentTypeId { get; set; }
        public int TotalUses { get; set; }
        public bool ProviderLocked { get; set; }
        public string? ProviderId { get; set; }
        public int? ExpiresAfterDays { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public sealed class UpdatePackageDto
    {
        public string? Name { get; set; }
        public int? AppointmentTypeId { get; set; }
        public int? TotalUses { get; set; }
        public bool? ProviderLocked { get; set; }
        public string? ProviderId { get; set; }
        public int? ExpiresAfterDays { get; set; }
        public bool? IsActive { get; set; }
    }
}
