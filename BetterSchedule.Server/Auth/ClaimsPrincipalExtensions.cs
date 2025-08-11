using System.Security.Claims;

namespace BetterSchedule.Server.Auth
{
    public static class ClaimsPrincipalExtensions
    {
        public static string GetOrgIdOrThrow(this ClaimsPrincipal user)
        {
            var orgId = user.FindFirst("org_id")?.Value;
            if (string.IsNullOrWhiteSpace(orgId))
                throw new UnauthorizedAccessException("Missing org_id claim.");
            return orgId;
        }

        public static bool TryGetOrgId(this ClaimsPrincipal user, out string orgId)
        {
            orgId = user.FindFirst("org_id")?.Value ?? string.Empty;
            return !string.IsNullOrWhiteSpace(orgId);
        }

        public static string? GetUserId(this ClaimsPrincipal user)
            => user.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
