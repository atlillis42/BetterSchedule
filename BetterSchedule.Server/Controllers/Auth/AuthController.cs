using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Models.DTOs.Auth;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Options;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BetterSchedule.Server.Controllers.Auth
{
    /// <summary>
    /// Authentication and session endpoints for the SPA.
    /// Exposes status, register, logout, and a dev-only login for local testing.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _env;
        private readonly IOptions<FeatureFlagsOptions> _features;

        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IWebHostEnvironment env,
            IOptions<FeatureFlagsOptions> features)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _env = env;
            _features = features;
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
                user = isAuthenticated ? User.FindFirstValue(ClaimTypes.Name) : null,
                userId = isAuthenticated ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null,
                roles = isAuthenticated ? User.FindAll(ClaimTypes.Role).Select(r => r.Value) : Array.Empty<string>(),
                organizationId = isAuthenticated ? User.FindFirst("org_id")?.Value : null,
                demoSwitcherEnabled = _env.IsDevelopment() || _features.Value.EnableDemoSwitcher
            });
        }

        /// <summary>
        /// Registers a new user and signs them in (cookie auth).
        /// </summary>
        [HttpPost("register")]
        [AllowAnonymous]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (req is null)
                return BadRequest(new { message = "Invalid payload." });

            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Email and password are required." });

            static string Norm(string? s) =>
                string.IsNullOrWhiteSpace(s)
                    ? string.Empty
                    : Regex.Replace(s.Trim(), "\\s+", " ");

            var email = req.Email.Trim();

            var first = Norm(req.FirstName);
            var last = Norm(req.LastName);

            if (string.IsNullOrEmpty(first) && string.IsNullOrEmpty(last) && !string.IsNullOrWhiteSpace(req.FullName))
            {
                var fullNorm = Norm(req.FullName);
                var parts = fullNorm.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2)
                {
                    first = parts[0];
                    last = string.Join(" ", parts.Skip(1));
                }
                else if (parts.Length == 1)
                {
                    first = parts[0];
                }
            }

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FirstName = string.IsNullOrWhiteSpace(first) ? null : first,
                LastName = string.IsNullOrWhiteSpace(last) ? null : last
            };

            var full = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
            user.FullName = string.IsNullOrWhiteSpace(full) ? email.Split('@')[0] : full;

            var result = await _userManager.CreateAsync(user, req.Password!);
            if (!result.Succeeded)
            {
                var firstError = result.Errors.FirstOrDefault()?.Description ?? "Registration failed.";
                return BadRequest(new { message = firstError });
            }

            await _signInManager.SignInAsync(user, isPersistent: false);
            return Ok(new { userId = user.Id });
        }

        /// <summary>Signs the current user out of the application.</summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            Response.Cookies.Delete(".BetterSchedule.Identity");            
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

        /// <summary>
        /// DEV-ONLY: login using username OR email in Identifier.
        /// </summary>
        [HttpPost("dev-login")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DevLogin([FromBody] DevLoginRequest req)
        {
            if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
                return NotFound();

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
