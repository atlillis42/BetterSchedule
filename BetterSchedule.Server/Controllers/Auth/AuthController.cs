using BetterSchedule.Server.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;


namespace BetterSchedule.Server.Controllers.Auth
{
    /// <summary>
    /// Provides endpoints for authentication and session management.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        /// <summary>
        /// Gets the current authentication status including user information and roles.
        /// </summary>
        /// <returns>Information about the current user or anonymous status.</returns>
        [HttpGet("status")]
        [AllowAnonymous]
        public IActionResult Status()
        {
            var isAuthenticated = User.Identity?.IsAuthenticated ?? false;

            return Ok(new
            {
                authenticated = isAuthenticated,
                user = isAuthenticated ? User.Identity?.Name : null,
                userId = isAuthenticated ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null,
                roles = isAuthenticated ? User.FindAll(ClaimTypes.Role).Select(r => r.Value) : Array.Empty<string>(),
                organizationId = isAuthenticated ? User.FindFirst("org_id")?.Value : null
            });
        }

        /// <summary>
        /// Signs the current user out of the application.
        /// </summary>
        /// <returns>A confirmation that the user has been logged out.</returns>
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            Response.Cookies.Delete(".AspNetCore.Identity.Application");
            return Ok(new { message = "Logged out succesfully" });
        }

        /// <summary>
        /// Refreshes the authentication ticket and returns the current user claims.
        /// </summary>
        /// <returns>The refreshed user information.</returns>
        [HttpPost("refresh")]
        [Authorize]
        public IActionResult Refresh()
        {
            var orgId = User.GetOrgIdOrThrow();

            return Ok(new
            {
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
                roles = User.FindAll(ClaimTypes.Role).Select(r => r.Value),
                organizationId = orgId
            });
        }
    }
}
