using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;


namespace BetterSchedule.Server.Controllers.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        [HttpGet("status")]
        public IActionResult Status()
        {
            var isAuthenticated = User.Identity?.IsAuthenticated ?? false;

            return Ok(new
            {
                authenticated = isAuthenticated,
                user = isAuthenticated ? User.Identity?.Name : null
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            //Clear the authentication cookie
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);

            Response.Cookies.Delete(".AspNetCore.Identity.Application");

            return Ok(new { message = "Logged out succesfully" });
        }

        [HttpPost("refresh")]
        [Authorize]               // must already have a valid cookie
        public IActionResult Refresh()
        {

            return Ok(new
            {
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
                roles = User.FindAll(ClaimTypes.Role).Select(r => r.Value)
            });

        }
    }
}
