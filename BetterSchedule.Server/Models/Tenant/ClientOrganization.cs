using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Many-to-many association linking a client user to an organization.
    /// Enables a single client account to belong to multiple organizations.
    /// </summary>
    public class ClientOrganization
    {
        /// <summary>Unique identifier for this association row.</summary>
        [Key]
        public int Id { get; set; }

        /// <summary>Identifier of the client user.</summary>
        [Required]
        public string ClientId { get; set; } = default!;

        /// <summary>Navigation to the client user.</summary>
        public ApplicationUser Client { get; set; } = default!;

        /// <summary>Identifier of the related organization.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Navigation to the related organization.</summary>
        public Organization Organization { get; set; } = default!;
    }
}
