using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Demo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BetterSchedule.Server.Controllers.Demo
{
    [ApiController]
    [Route("api/demo")]
    [Produces("application/json")]
    public sealed class DemoController : ControllerBase
    {
        private readonly ISandboxService _sandboxService;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _env;
        private readonly HashSet<string> _configuredOrigins; 

        public DemoController(
            ISandboxService sandboxService,
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IConfiguration config,
            IWebHostEnvironment env)
        {
            _sandboxService = sandboxService;
            _signInManager = signInManager;
            _userManager = userManager;
            _env = env;

            // Pull trusted origins from either old keys (App:ClientUrl/App:ExtraOrigins) or new CORS setting (Cors:AllowedOrigins)
            _configuredOrigins = new(StringComparer.OrdinalIgnoreCase);

            void add(string? s)
            {
                if (string.IsNullOrWhiteSpace(s)) return;
                var trimmed = s.Trim().TrimEnd('/').ToLowerInvariant();
                if (trimmed.StartsWith("http://") || trimmed.StartsWith("https://"))
                    _configuredOrigins.Add(trimmed);
            }

            add(config["App:ClientUrl"]);
            var extraOld = (config["App:ExtraOrigins"] ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var o in extraOld) add(o);

            var cors = (config["Cors:AllowedOrigins"] ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var o in cors) add(o);
        }

        [HttpPost("start")]
        [AllowAnonymous]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(StartDemoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [EnableRateLimiting("DemoStartPolicy")]
        public async Task<IActionResult> StartAsync(CancellationToken cancellationToken)
        {
            // In Production, require trusted origin (same-origin or whitelisted)
            if (!_env.IsDevelopment() && !IsTrustedSpaRequest())
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "forbidden", message = "Cross-site request not allowed." });

            var result = await _sandboxService.StartAnonymousSandboxAsync(cancellationToken);

            var user = await _userManager.FindByIdAsync(result.EphemeralUserId);
            if (user is null)
                return Problem("Ephemeral user creation failed.", statusCode: StatusCodes.Status500InternalServerError);

            await _signInManager.SignInAsync(user, isPersistent: false);

            return Ok(new StartDemoResponse
            {
                OrganizationId = result.OrganizationId,
                EphemeralUserId = result.EphemeralUserId
            });
        }

        [HttpPost("reset")]
        [Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [EnableRateLimiting("DemoResetPolicy")]
        public async Task<IActionResult> ResetAsync([FromQuery] string? organizationId, CancellationToken cancellationToken)
        {
            if (!_env.IsDevelopment() && !IsTrustedSpaRequest())
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "forbidden", message = "Cross-site request not allowed." });

            var callerOrgId = User.GetOrgIdOrThrow();
            var targetOrgId = string.IsNullOrWhiteSpace(organizationId) ? callerOrgId : organizationId;

            if (!string.Equals(callerOrgId, targetOrgId, StringComparison.Ordinal))
                return Forbid();

            var callerUserId = User.GetUserIdOrThrow();
            var org = await _sandboxService.ResetSandboxAsync(targetOrgId, callerUserId, cancellationToken);

            return Ok(new
            {
                organizationId = org.Id,
                resetAtUtc = DateTimeOffset.UtcNow
            });
        }

        [HttpGet("status")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Status() => Ok(new { serverUtc = DateTimeOffset.UtcNow });

        public sealed class StartDemoResponse
        {
            public required string OrganizationId { get; init; }
            public required string EphemeralUserId { get; init; }
        }

        // ---------------------------
        // Helpers
        // ---------------------------
        private bool IsTrustedSpaRequest()
        {
            // 1) Always trust self-origin (app’s own host) in Production
            var selfOrigin = $"{Request.Scheme}://{Request.Host.Value}".TrimEnd('/');

            // Build the trust list: self + configured
            var trusted = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { selfOrigin };
            foreach (var o in _configuredOrigins) trusted.Add(o);

            // Try Origin first
            var origin = Request.Headers["Origin"].ToString().TrimEnd('/');
            if (!string.IsNullOrEmpty(origin) && trusted.Contains(origin)) return true;

            // Fallback to Referer prefix
            var referer = Request.Headers["Referer"].ToString();
            if (!string.IsNullOrEmpty(referer))
            {
                foreach (var o in trusted)
                {
                    if (referer.StartsWith(o, StringComparison.OrdinalIgnoreCase)) return true;
                }
            }

            return false;
        }
    }
}
