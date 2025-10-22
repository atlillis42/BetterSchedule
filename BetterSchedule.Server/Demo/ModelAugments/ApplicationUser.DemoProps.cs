using System;

namespace BetterSchedule.Server.Models.Identity
{
    /// <summary>
    /// Ephemeral demo-session flags for Identity users.
    /// This partial lives under Server/Demo to avoid touching the core model file.
    /// </summary>
    public partial class ApplicationUser
    {
        /// <summary>True if this Identity user was minted exclusively for a demo sandbox session.</summary>
        public bool IsDemoEphemeral { get; set; }

        /// <summary>When set, cleanup can remove the user after this UTC time.</summary>
        public DateTimeOffset? DemoExpiresAtUtc { get; set; }
    }
}
