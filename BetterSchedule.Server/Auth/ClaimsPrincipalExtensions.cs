using System.Security.Claims;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Convenience helpers for extracting common claims from <see cref="ClaimsPrincipal"/>.
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Returns the required organization id from the <c>org_id</c> claim or throws when missing/blank.
        /// </summary>
        public static string GetOrgIdOrThrow(this ClaimsPrincipal user)
        {
            var orgId = user.FindFirst("org_id")?.Value;
            if (string.IsNullOrWhiteSpace(orgId))
                throw new UnauthorizedAccessException("Missing org_id claim.");
            return orgId;
        }

        /// <summary>
        /// Attempts to read the <c>org_id</c> claim.
        /// </summary>
        public static bool TryGetOrgId(this ClaimsPrincipal user, out string orgId)
        {
            orgId = user.FindFirst("org_id")?.Value ?? string.Empty;
            return !string.IsNullOrWhiteSpace(orgId);
        }

        /// <summary>
        /// Returns the identity <see cref="ClaimTypes.NameIdentifier"/> or <c>null</c> if absent.
        /// </summary>
        public static string? GetUserId(this ClaimsPrincipal user)
            => user.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Returns the identity <see cref="ClaimTypes.NameIdentifier"/> or throws when missing.
        /// </summary>
        public static string GetUserIdOrThrow(this ClaimsPrincipal user)
        {
            var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(id))
                throw new UnauthorizedAccessException("Missing user id claim.");
            return id;
        }
    }
}
