using BetterSchedule.Server.Database;
using Microsoft.AspNetCore.Identity;
using BetterSchedule.Server.Models.Identity;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Adds custom claims to the authenticated principal.
    /// Currently includes <c>org_id</c> for org scoping across controllers.
    /// </summary>
    public class CustomClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
    {
        /// <summary>
        /// Creates a new <see cref="CustomClaimsPrincipalFactory"/>.
        /// </summary>
        public CustomClaimsPrincipalFactory(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IOptions<IdentityOptions> optionsAccessor)
            : base(userManager, roleManager, optionsAccessor)
        { }

        /// <summary>
        /// Generates the identity and appends custom claims (e.g., <c>org_id</c>).
        /// </summary>
        protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
        {
            var identity = await base.GenerateClaimsAsync(user);
            if (!string.IsNullOrEmpty(user.OrganizationId))
            {
                identity.AddClaim(new Claim("org_id", user.OrganizationId));
            }
            // Optionally add other claims (e.g., display name)
            return identity;
        }
    }
}
