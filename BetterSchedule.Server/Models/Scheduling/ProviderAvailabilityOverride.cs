namespace BetterSchedule.Server.Models.Scheduling
{
    /// <summary>
    /// One-off override to a provider’s weekly availability on a specific local date
    /// (blackout or extra availability). Placeholder for a future feature. Supports soft delete.
    /// </summary>
    public class ProviderAvailabilityOverride
    {
        /// <summary>Unique identifier for the override entry.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        public string OrganizationId { get; set; } = default!;

        /// <summary>Identifier of the service provider.</summary>
        public string ServiceProviderId { get; set; } = default!;

        /// <summary>Local calendar date this override applies to.</summary>
        public DateOnly Date { get; set; }

        /// <summary>Optional local start time (null with <see cref="IsAvailable"/> = false indicates a whole-day blackout).</summary>
        public TimeSpan? StartLocalTime { get; set; }

        /// <summary>Optional local end time.</summary>
        public TimeSpan? EndLocalTime { get; set; }

        /// <summary>Whether this override adds availability (true) or removes it (false).</summary>
        public bool IsAvailable { get; set; }

        /// <summary>Whether this override is soft deleted.</summary>
        public bool IsDeleted { get; set; }
    }
}
