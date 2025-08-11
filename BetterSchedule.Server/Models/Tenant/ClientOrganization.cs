using BetterSchedule.Server.Database;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    public class ClientOrganization
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ClientId { get; set; } // FK to ApplicationUser or Client
        public ApplicationUser Client { get; set; }

        [Required]
        public string OrganizationId { get; set; }
        public Organization Organization { get; set; }
    }
}
