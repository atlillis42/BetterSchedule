using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Models.Tenant;

namespace BetterSchedule.Server.Services.Demo
{
    /// <summary>
    /// Creates, resets, and cleans up per-visitor demo sandboxes.
    /// Each demo start provisions a brand new Organization and an ephemeral Identity user.
    /// The seeded dataset mirrors your standard demo content (single-organization scope).
    /// </summary>
    public interface ISandboxService
    {
        /// <summary>
        /// Creates a fresh sandbox organization (with a unique identifier), seeds demo data,
        /// and mints an ephemeral Identity user in Manager (and typically ServiceProvider) roles.
        /// Returns identifiers for the new organization and user.
        /// </summary>
        Task<SandboxStartResult> StartAnonymousSandboxAsync(CancellationToken ct);

        /// <summary>
        /// Resets an existing sandbox by deleting its child graph and re-seeding the same organization.
        /// Optionally excludes a specific user id (typically the caller) from demo-user cleanup.
        /// </summary>
        Task<Organization> ResetSandboxAsync(string sandboxOrganizationId, string? excludeUserId, CancellationToken ct);

        /// <summary>
        /// Deletes all expired demo organizations and their ephemeral users.
        /// Returns the count of organizations removed.
        /// </summary>
        Task<int> CleanupExpiredSandboxesAsync(CancellationToken ct);
    }

    /// <summary>
    /// Outcome of starting an anonymous demo session.
    /// </summary>
    public sealed class SandboxStartResult
    {
        /// <summary>Id of the newly created demo organization.</summary>
        public required string OrganizationId { get; init; }

        /// <summary>Id of the ephemeral Identity user signed in for the session.</summary>
        public required string EphemeralUserId { get; init; }

        /// <summary>Email of the ephemeral Identity user (for diagnostics).</summary>
        public required string EphemeralUserEmail { get; init; }

        /// <summary>True if a new organization was created (always true for demo start).</summary>
        public required bool IsNewOrg { get; init; }
    }
}
