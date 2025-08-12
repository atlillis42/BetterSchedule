using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    public class ClientOrganization
    {
        [Key] 
        public int Id { get; set; }


        [Required] 
        public string ClientId { get; set; } = default!;
        public ApplicationUser Client { get; set; } = default!;


        [Required]
        public string OrganizationId { get; set; } = default!;
        public Organization Organization { get; set; } = default!;
    }
}
