using System;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Demo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

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
        private readonly IDemoRateLimiter _rateLimiter;

        /// <summary>
        /// Initializes a new instance of the <see cref="DemoController"/>.
        /// </summary>
        public DemoController(
            ISandboxService sandboxService,
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IDemoRateLimiter rateLimiter)
        {
            _sandboxService = sandboxService;
            _signInManager = signInManager;
            _userManager = userManager;
            _rateLimiter = rateLimiter;
        }

        /// <summary>
        /// Creates a new demo sandbox organization, seeds demo data, and signs in an ephemeral user (cookie auth).
        /// Returns the created organization id and the ephemeral user id.
        /// Rate limited globally on the server.
        /// </summary>
        /// <remarks>
        /// On success: 200 OK { organizationId, ephemeralUserId } and a session cookie is set.<br/>
        /// On throttle: 429 Too Many Requests with Retry-After header and body { error, retryAfterSeconds }.
        /// </remarks>
        /// <response code="200">Sandbox created and user signed in.</response>
        /// <response code="429">Too many demo start requests during the current window.</response>
        [HttpPost("start")]
        [AllowAnonymous]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(StartDemoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> StartAsync(CancellationToken cancellationToken)
        {
            // Global limiter for demo start; no IP or user tracking.
            if (!_rateLimiter.TryConsume("demo-start:global", out var retryAfter))
            {
                return TooManyRequests(retryAfter);
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
        /// Rate limited globally on the server.
        /// </summary>
        /// <remarks>
        /// On success: 200 OK { organizationId, resetAtUtc }. <br/>
        /// On forbidden cross-org attempt: 403 Forbidden. <br/>
        /// On throttle: 429 Too Many Requests with Retry-After header and body { error, retryAfterSeconds }.
        /// </remarks>
        /// <param name="organizationId">Optional explicit organization id; defaults to the caller's <c>org_id</c> claim.</param>
        /// <response code="200">Sandbox reset completed.</response>
        /// <response code="403">Caller attempted to reset a different organization.</response>
        /// <response code="429">Too many demo reset requests during the current window.</response>
        [HttpPost("reset")]
        [Authorize]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> ResetAsync([FromQuery] string? organizationId, CancellationToken cancellationToken)
        {
            var callerOrgId = User.GetOrgIdOrThrow();
            var targetOrgId = string.IsNullOrWhiteSpace(organizationId) ? callerOrgId : organizationId;

            if (!string.Equals(callerOrgId, targetOrgId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            // Global limiter for resets as well (heavier path).
            if (!_rateLimiter.TryConsume("demo-reset:global", out var retryAfter))
            {
                return TooManyRequests(retryAfter);
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

        /// <summary>
        /// Produces a 429 Too Many Requests response with a Retry-After header and JSON body.
        /// </summary>
        private IActionResult TooManyRequests(TimeSpan retryAfter)
        {
            var seconds = (int)Math.Ceiling(Math.Max(0, retryAfter.TotalSeconds));
            Response.Headers["Retry-After"] = seconds.ToString();
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                error = "rate_limited",
                retryAfterSeconds = seconds
            });
        }

        /// <summary>Response model for a successful demo start.</summary>
        public sealed class StartDemoResponse
        {
            /// <summary>Identifier of the created demo organization.</summary>
            public required string OrganizationId { get; init; }
            /// <summary>Identifier of the signed-in ephemeral user.</summary>
            public required string EphemeralUserId { get; init; }
        }
    }
}
