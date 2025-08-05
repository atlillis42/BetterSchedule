using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using BetterSchedule.Server.Database;

[Route("api/[controller]")]
[ApiController]
public class ClientsController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ClientsController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET: /api/clients?search=abc
    [HttpGet]
    [Authorize(Roles = "Admin,Provider")] //TODO: Adjust as needed
    public async Task<IActionResult> GetClients([FromQuery] string? search = null)
    {
        var allClients = await _userManager.GetUsersInRoleAsync("Client");
        var filtered = string.IsNullOrWhiteSpace(search)
            ? allClients
            : allClients.Where(u =>
                (!string.IsNullOrEmpty(u.FullName) && u.FullName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(u.Email) && u.Email.Contains(search, StringComparison.OrdinalIgnoreCase))
            ).ToList();

        // Return only needed fields (for dropdown)
        var result = filtered
            .OrderBy(u => u.FullName ?? u.Email)
            .Select(u => new {
                id = u.Id,
                name = u.FullName ?? u.Email
            }).ToList();

        return Ok(result);
    }
}
