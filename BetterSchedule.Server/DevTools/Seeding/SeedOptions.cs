using System;

namespace BetterSchedule.Server.DevTools.Seeding
{
    /// <summary>
    /// Controls when/how seeding runs.
    /// Bound from configuration: "Seeding": { ... }.
    /// </summary>
    public enum SeedProfile
    {
        Base = 0,
        Demo = 1
    }

    /// <summary>
    /// Options for seed execution.
    /// </summary>
    public sealed class SeedOptions
    {
        /// <summary>Enables seeding on startup.</summary>
        public bool Enabled { get; init; } = true;

        /// <summary>Profile to run: Base (deterministic) or Demo (rolling dates).</summary>
        public SeedProfile Profile { get; init; } = SeedProfile.Base;

        /// <summary>Optional scenario pack names to run after the profile (e.g., "DoubleBookingConflict").</summary>
        public string[] Scenarios { get; init; } = Array.Empty<string>();

        /// <summary>When true, dates are computed from the current week start in org timezone (Demo only).</summary>
        public bool RollingDates { get; init; } = false;

        /// <summary>Anchor local date (org timezone) for deterministic schedules. If null, defaults to a known fixed date.</summary>
        public DateOnly? AnchorLocalDate { get; init; }

        /// <summary>Optional domain reset before seeding (non-identity destructive operations).</summary>
        public bool Reset { get; init; } = false;
    }
}
