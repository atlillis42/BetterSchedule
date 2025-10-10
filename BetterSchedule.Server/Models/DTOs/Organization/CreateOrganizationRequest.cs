using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>Request payload for creating an organization.</summary>
    public sealed class CreateOrganizationRequest
    {
        /// <summary>Display name of the new organization.</summary>
        [Required, MaxLength(128)]
        public string Name { get; set; } = string.Empty;
    }
}
