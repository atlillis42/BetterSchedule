using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BetterSchedule.Server.Controllers.Auth
{
    /// <summary>
    /// Authentication and session endpoints.
    /// Exposes status, logout, and a dev-only login for local testing.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _env;

        /// <summary>Initializes a new instance of <see cref="AuthController"/>.</summary>
        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IWebHostEnvironment env)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _env = env;
        }

        /// <summary>
        /// Returns the caller's authentication state, roles, and organization id (if authenticated).
        /// </summary>
        [HttpGet("status")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
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

        /// <summary>Signs the current user out of the application.</summary>
        [HttpPost("logout")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            Response.Cookies.Delete(".AspNetCore.Identity.Application");
            return Ok(new { message = "Logged out successfully" });
        }

        /// <summary>Refreshes the authentication ticket and returns current claims info.</summary>
        [HttpPost("refresh")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
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

        // ---------------------------
        // DEV ONLY: flexible login
        // ---------------------------

        /// <summary>
        /// DEV-ONLY: login using username OR email in <c>Identifier</c>.
        /// Not available outside development environments.
        /// </summary>
        [HttpPost("dev-login")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DevLogin([FromBody] DevLoginRequest req)
        {
            if (!_env.IsDevelopment()) return NotFound();

            var user = await _userManager.FindByEmailAsync(req.Identifier)
                       ?? await _userManager.FindByNameAsync(req.Identifier);

            if (user is null) return Unauthorized(new { success = false });

            var result = await _signInManager.PasswordSignInAsync(
                user.UserName!, req.Password, req.RememberMe, lockoutOnFailure: false);

            if (!result.Succeeded) return Unauthorized(new { success = false });

            return Ok(new { success = true });
        }

        /// <summary>Payload for dev-only login.</summary>
        public sealed record DevLoginRequest(string Identifier, string Password, bool RememberMe = false);
    }
}
