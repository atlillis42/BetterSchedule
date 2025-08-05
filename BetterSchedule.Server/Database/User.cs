using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Server.Database
{
    public class ApplicationUser : IdentityUser
    {
        public string? FullName { get; set; }
        public bool IsDeleted { get; set; } = false;

    }
}
