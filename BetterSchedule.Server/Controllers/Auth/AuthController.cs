using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;


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
        public async Task <IActionResult> Logout()
        {
            //Clear the authentication cookie
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);

            Response.Cookies.Delete(".AspNetCore.Identity.Application");

            return Ok(new { message = "Logged out succesfully" });
        }
    }
}
