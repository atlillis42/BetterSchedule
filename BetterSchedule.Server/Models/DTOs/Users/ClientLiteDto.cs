using System;

namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Lightweight client projection for selectors and quick lookups.
    /// </summary>
    public sealed class ClientLiteDto
    {
        /// <summary>Client user identifier.</summary>
        public string Id { get; init; } = default!;

        /// <summary>Display name (FullName if present; otherwise UserName or Email).</summary>
        public string Name { get; init; } = default!;
    }
}
