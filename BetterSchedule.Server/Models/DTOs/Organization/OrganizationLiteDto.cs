using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Organization
{
    /// <summary>Lightweight projection for listing organizations.</summary>
    public sealed class OrganizationLiteDto
    {
        [Required] public string Id { get; init; } = default!;
        [Required] public string Name { get; init; } = default!;
    }
}
