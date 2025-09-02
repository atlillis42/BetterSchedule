using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Command to grant an existing package to a client.
    /// </summary>
    public sealed class GrantPackageDto
    {
        /// <summary>Identifier of the client receiving the package.</summary>
        [Required]
        public string ClientId { get; set; } = default!;

        /// <summary>Identifier of the package to grant.</summary>
        [Required]
        public int PackageId { get; set; }
    }
}
