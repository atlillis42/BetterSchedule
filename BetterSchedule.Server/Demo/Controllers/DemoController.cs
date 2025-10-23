using System;
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
    /// <summary>
    /// Provides demo sandbox endpoints.
    /// </summary>
    [ApiController]
    [Route("api/demo")]
    [Produces("application/json")]
    public sealed class DemoController : ControllerBase
    {
        private readonly ISandboxService _sandboxService;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _env;
        private readonly string _clientOrigin;

        /// <summary>
        /// Initializes a new instance of the <see cref="DemoController"/>.
        /// </summary>
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
            _clientOrigin = (config["App:ClientUrl"] ?? string.Empty).TrimEnd('/');
        }

        /// <summary>
        /// Creates a new demo sandbox organization, seeds demo data, and signs in an ephemeral user (cookie auth).
        /// Returns the created organization id and the ephemeral user id.
        /// </summary>
        /// <remarks>
        /// <b>Rate limiting:</b> Policy <c>DemoStartPolicy</c> applies — partitioned by client IP
        /// to prevent one abusive client from starving others.<br/>
        /// On success: 200 OK { organizationId, ephemeralUserId } with a session cookie set.<br/>
        /// On throttle (handled by middleware): 429 Too Many Requests with <c>Retry-After</c> header and body
        /// { error, retryAfterSeconds }.
        /// </remarks>
        /// <response code="200">Sandbox created and user signed in.</response>
        /// <response code="403">Cross-site request blocked.</response>
        /// <response code="429">Too many demo start requests during the current window.</response>
        [HttpPost("start")]
        [AllowAnonymous]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(StartDemoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [EnableRateLimiting("DemoStartPolicy")]
        public async Task<IActionResult> StartAsync(CancellationToken cancellationToken)
        {
            // CSRF-lite origin guard: only allow posts from your SPA origin (skip in Development).
            if (!_env.IsDevelopment() && !IsTrustedSpaRequest())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "forbidden", message = "Cross-site request not allowed." });
            }

            var result = await _sandboxService.StartAnonymousSandboxAsync(cancellationToken);

            // Sign in the ephemeral user so SPA has a session cookie immediately.
            var user = await _userManager.FindByIdAsync(result.EphemeralUserId);
            if (user is null)
            {
                return Problem("Ephemeral user creation failed.", statusCode: StatusCodes.Status500InternalServerError);
            }

            await _signInManager.SignInAsync(user, isPersistent: false);

            return Ok(new StartDemoResponse
            {
                OrganizationId = result.OrganizationId,
                EphemeralUserId = result.EphemeralUserId
            });
        }

        /// <summary>
        /// Resets the caller's demo sandbox by deleting its data and re-seeding.
        /// Scope is restricted to the caller's current organization (org_id claim).
        /// Returns the organization id and the reset timestamp.
        /// </summary>
        /// <remarks>
        /// <b>Rate limiting:</b> Policy <c>DemoResetPolicy</c> applies — partitioned by
        /// <c>org_id</c> + <c>user_id</c> to isolate callers.<br/>
        /// On success: 200 OK { organizationId, resetAtUtc }.<br/>
        /// On forbidden cross-org attempt: 403 Forbidden.<br/>
        /// On throttle (handled by middleware): 429 Too Many Requests with <c>Retry-After</c> header and body
        /// { error, retryAfterSeconds }.
        /// </remarks>
        /// <param name="organizationId">Optional explicit organization id; defaults to the caller's <c>org_id</c> claim.</param>
        /// <response code="200">Sandbox reset completed.</response>
        /// <response code="403">Caller attempted to reset a different organization or cross-site request blocked.</response>
        /// <response code="429">Too many demo reset requests during the current window.</response>
        [HttpPost("reset")]
        [Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [EnableRateLimiting("DemoResetPolicy")]
        public async Task<IActionResult> ResetAsync([FromQuery] string? organizationId, CancellationToken cancellationToken)
        {
            // CSRF-lite origin guard for state-changing POSTs (skip in Development).
            if (!_env.IsDevelopment() && !IsTrustedSpaRequest())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "forbidden", message = "Cross-site request not allowed." });
            }

            var callerOrgId = User.GetOrgIdOrThrow();
            var targetOrgId = string.IsNullOrWhiteSpace(organizationId) ? callerOrgId : organizationId;

            if (!string.Equals(callerOrgId, targetOrgId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            var callerUserId = User.GetUserIdOrThrow();
            var org = await _sandboxService.ResetSandboxAsync(targetOrgId, callerUserId, cancellationToken);

            return Ok(new
            {
                organizationId = org.Id,
                resetAtUtc = DateTimeOffset.UtcNow
            });
        }

        /// <summary>Returns a lightweight status payload for health checks.</summary>
        [HttpGet("status")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Status() => Ok(new { serverUtc = DateTimeOffset.UtcNow });

        /// <summary>Response model for a successful demo start.</summary>
        public sealed class StartDemoResponse
        {
            /// <summary>Identifier of the created demo organization.</summary>
            public required string OrganizationId { get; init; }
            /// <summary>Identifier of the signed-in ephemeral user.</summary>
            public required string EphemeralUserId { get; init; }
        }

        // ---------------------------
        // Helpers
        // ---------------------------

        /// <summary>
        /// Very lightweight CSRF guard that only allows requests originating from the configured SPA origin.
        /// Uses Origin first, then falls back to Referer (both are required by modern browsers on CORS/Credentialed fetches).
        /// </summary>
        private bool IsTrustedSpaRequest()
        {
            if (string.IsNullOrWhiteSpace(_clientOrigin))
                return false;

            var origin = Request.Headers["Origin"].ToString().TrimEnd('/');
            if (!string.IsNullOrEmpty(origin))
            {
                return string.Equals(origin, _clientOrigin, StringComparison.OrdinalIgnoreCase);
            }

            var referer = Request.Headers["Referer"].ToString();
            if (!string.IsNullOrEmpty(referer))
            {
                // Accept if Referer starts with the SPA origin.
                return referer.StartsWith(_clientOrigin, StringComparison.OrdinalIgnoreCase);
            }

            // No headers → treat as untrusted for POSTs
            return false;
        }
    }
}
