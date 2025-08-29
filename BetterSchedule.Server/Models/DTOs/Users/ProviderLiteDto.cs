using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Minimal provider listing record.
    /// </summary>
    public class ProviderLiteDto
    {
        /// <summary>Identifier of the provider user.</summary>
        [Required]
        public string Id { get; init; } = default!;

        /// <summary>Display name of the provider.</summary>
        [Required]
        public string Name { get; init; } = default!;

        /// <summary>
        /// When <c>true</c>, clients may view this provider’s availability.
        /// Mirrors <c>ApplicationUser.AvailabilityPublic</c>.
        /// </summary>
        public bool AvailabilityPublic { get; init; } = false;
    }
}
