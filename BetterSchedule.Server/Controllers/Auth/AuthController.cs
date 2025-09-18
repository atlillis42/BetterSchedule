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
    /// Includes status, login, register, logout, refresh, and a dev-only flexible login.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _env;

        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IWebHostEnvironment env)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _env = env;
        }

        // --------------------------------------------------------------------
        // Status / Logout / Refresh
        // --------------------------------------------------------------------
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

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            return Ok(new { message = "Logged out successfully" });
        }

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

        // --------------------------------------------------------------------
        // Standard LOGIN (non-dev)
        // --------------------------------------------------------------------
        /// <summary>
        /// Username-or-email + password login. Sets the auth cookie.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Identifier) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Identifier and password are required." });

            var user = await _userManager.FindByEmailAsync(req.Identifier)
                       ?? await _userManager.FindByNameAsync(req.Identifier);
            if (user is null)
                return Unauthorized(new { message = "Invalid credentials." });

            var result = await _signInManager.PasswordSignInAsync(
                user.UserName!, req.Password, req.RememberMe, lockoutOnFailure: false);

            if (!result.Succeeded)
                return Unauthorized(new { message = "Invalid credentials." });

            return Ok(new { message = "Logged in." });
        }

        public sealed record LoginRequest(string Identifier, string Password, bool RememberMe = false);

        // --------------------------------------------------------------------
        // Standard REGISTER (non-dev)
        // --------------------------------------------------------------------
        /// <summary>
        /// Creates a new user (no org, no roles), confirms email in Development, and signs them in.
        /// </summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Email and password are required." });

            var existing = await _userManager.FindByEmailAsync(req.Email);
            if (existing is not null)
                return Conflict(new { message = "An account with this email already exists." });

            var user = new ApplicationUser
            {
                UserName = req.Email,                 
                Email = req.Email,
                EmailConfirmed = _env.IsDevelopment(),
                FullName = string.IsNullOrWhiteSpace(req.FullName) ? null : req.FullName,
                OrganizationId = null,                // user joins org later
                AvailabilityPublic = false
            };

            var result = await _userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return BadRequest(new { message = "Registration failed.", errors = result.Errors.Select(e => e.Description) });

            await _signInManager.SignInAsync(user, isPersistent: false);
            return Ok(new { message = "Registered.", userId = user.Id });
        }

        public sealed record RegisterRequest(string Email, string Password, string? FullName);

        // --------------------------------------------------------------------
        // DEV-ONLY flexible login (identifier = username OR email)
        // --------------------------------------------------------------------
        [HttpPost("dev-login")]
        [AllowAnonymous]
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

        public sealed record DevLoginRequest(string Identifier, string Password, bool RememberMe = false);
    }
}
