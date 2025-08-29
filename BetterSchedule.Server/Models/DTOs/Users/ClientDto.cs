using System;

namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Detailed client information for admin views or enriched lists.
    /// Mirrors <see cref="ProviderDto"/> fields for consistency.
    /// </summary>
    public sealed class ClientDto
    {
        /// <summary>Client user identifier.</summary>
        public string Id { get; init; } = default!;

        /// <summary>Display name (FullName if present; otherwise UserName or Email).</summary>
        public string Name { get; init; } = default!;

        /// <summary>Username (nullable).</summary>
        public string? UserName { get; init; }

        /// <summary>Email address (nullable).</summary>
        public string? Email { get; init; }
    }
}
