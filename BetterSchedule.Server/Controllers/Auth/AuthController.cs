using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Controllers.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        [HttpGet("status")]
        public IActionResult Status()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return Ok(new { authenticated=true, User = User.Identity.Name });
            }
            else
            {
                return Unauthorized(new { authenticated = false });
            }
        }
    }
}
