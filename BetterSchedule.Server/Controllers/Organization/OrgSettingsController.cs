using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Organization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Organization
{
    [ApiController]
    [Route("api/org-settings")]
    [Authorize(Roles = "Manager")]
    public sealed class OrgSettingsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public OrgSettingsController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<OrgSettingsDto>> Get(CancellationToken ct)
        {
            var org = await _db.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == OrganizationId, ct);

            if (org is null) return NotFound();

            return Ok(new OrgSettingsDto
            {
                BookingLeadTime = org.BookingLeadTime,
                CancellationWindow = org.CancellationWindow
            });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] UpdateOrgSettingsDto dto, CancellationToken ct)
        {
            var org = await _db.Organizations
                .FirstOrDefaultAsync(o => o.Id == OrganizationId, ct);

            if (org is null) return NotFound();

            if (dto.BookingLeadTime.HasValue)
                org.BookingLeadTime = dto.BookingLeadTime;
            if (dto.CancellationWindow.HasValue)
                org.CancellationWindow = dto.CancellationWindow;

            await _db.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}