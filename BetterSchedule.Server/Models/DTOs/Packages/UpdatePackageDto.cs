namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>Patch-style update payload for a package.</summary>
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
