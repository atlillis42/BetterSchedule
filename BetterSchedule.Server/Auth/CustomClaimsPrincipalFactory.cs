using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Adds custom claims to the authenticated principal:
    /// - org_id: current organization scope
    /// - name: friendly display (FullName > Email > UserName)
    /// - is_demo: "true" when the identity is an ephemeral demo user
    /// </summary>
    public sealed class CustomClaimsPrincipalFactory
        : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
    {
        public CustomClaimsPrincipalFactory(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IOptions<IdentityOptions> optionsAccessor)
            : base(userManager, roleManager, optionsAccessor) { }

        protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
        {
            var identity = await base.GenerateClaimsAsync(user);

            // ----- org_id -----
            if (!string.IsNullOrWhiteSpace(user.OrganizationId))
            {
                identity.AddClaim(new Claim("org_id", user.OrganizationId));
            }

            // ----- friendly Name (ClaimTypes.Name) -----
            // Default Identity sets Name to UserName; override with nicer display.
            var display =
                !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName! :
                !string.IsNullOrWhiteSpace(user.Email) ? user.Email! :
                user.UserName ?? "User";

            foreach (var existing in identity.FindAll(ClaimTypes.Name).ToList())
                identity.RemoveClaim(existing);

            identity.AddClaim(new Claim(ClaimTypes.Name, display));

            // ----- demo flag (optional convenience) -----
            if (user.IsDemoEphemeral)
            {
                identity.AddClaim(new Claim("is_demo", "true"));
            }

            return identity;
        }
    }
}
