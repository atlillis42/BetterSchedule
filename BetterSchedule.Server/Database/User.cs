using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Server.Database
{
    public class ApplicationUser : IdentityUser
    {
        public string? FullName { get; set; }
        public bool IsDeleted { get; set; } = false;
        public string? OrganizationId { get; set; }
        public Organization? Organization { get; set; }

    }
}
