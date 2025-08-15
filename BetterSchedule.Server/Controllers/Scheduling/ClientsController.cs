using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/clients")]
    public sealed class ClientsController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        public ClientsController(UserManager<ApplicationUser> userManager) => _userManager = userManager;

        // GET /api/clients?search=ann
        [HttpGet]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Search([FromQuery] string? search = null)
        {
            var orgId = User.GetOrgIdOrThrow();
            var q = (search ?? string.Empty).Trim();

            var roleUsers = await _userManager.GetUsersInRoleAsync("Client");
            var results = roleUsers
                .Where(u => u.OrganizationId == orgId)
                .Where(u =>
                    string.IsNullOrWhiteSpace(q) ||
                    (!string.IsNullOrWhiteSpace(u.FullName) && u.FullName.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(u.Email) && u.Email.Contains(q, StringComparison.OrdinalIgnoreCase)))
                .OrderBy(u => u.FullName ?? u.Email)
                .Select(u => new { id = u.Id, name = string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName })
                .ToList();

            return Ok(results);
        }
    }
}
