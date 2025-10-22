using System;
using System.Threading;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Services.Demo
{
    /// <summary>
    /// Seeds a complete, single-organization demo dataset for a newly created sandbox Organization.
    /// Intended for per-visitor ephemeral demos (no secondary org seeded).
    /// </summary>
    public interface IDemoSandboxSeeder
    {
        /// <summary>
        /// Seeds the demo dataset into <paramref name="organizationId"/> using the specified <paramref name="ephemeralUserId"/>.
        /// The ephemeral user will be treated as a Manager and ServiceProvider within the seeded graph.
        /// </summary>
        /// <param name="organizationId">Target Organization to seed.</param>
        /// <param name="ephemeralUserId">Existing Identity user id to wire in as Manager + ServiceProvider.</param>
        /// <param name="nowUtc">Optional clock for deterministic timestamps. Defaults to <see cref="DateTimeOffset.UtcNow"/>.</param>
        /// <param name="ct">Cancellation token.</param>
        Task SeedForSandboxOrgAsync(string organizationId, string ephemeralUserId, DateTimeOffset? nowUtc, CancellationToken ct);
    }
}
