using System;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Demo/ephemeral sandbox metadata for an Organization.
    /// This partial lives under Server/Demo to avoid touching the core model file.
    /// </summary>
    public partial class Organization
    {
        /// <summary>True if this org is a short-lived demo sandbox derived from a template.</summary>
        public bool IsDemo { get; set; }

        /// <summary>UTC timestamp when this sandbox was created.</summary>
        public DateTimeOffset? DemoCreatedAtUtc { get; set; }

        /// <summary>UTC timestamp when this sandbox expires and is eligible for cleanup.</summary>
        public DateTimeOffset? DemoExpiresAtUtc { get; set; }

        /// <summary>Template org id used to clone this sandbox (for diagnostics).</summary>
        public string? DemoTemplateSourceOrganizationId { get; set; }
    }
}
