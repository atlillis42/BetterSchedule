using BetterSchedule.Server.Database;
using Microsoft.AspNetCore.Identity;
using BetterSchedule.Server.Models.Identity;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Auth
{
    public class CustomClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
    {
        public CustomClaimsPrincipalFactory(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IOptions<IdentityOptions> optionsAccessor)
            : base(userManager, roleManager, optionsAccessor)
        { }

        protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
        {
            var identity = await base.GenerateClaimsAsync(user);
            if (!string.IsNullOrEmpty(user.OrganizationId))
            {
                identity.AddClaim(new Claim("org_id", user.OrganizationId));
            }
            // Optionally add other claims (like user's display name, etc)
            return identity;
        }
    }

}
