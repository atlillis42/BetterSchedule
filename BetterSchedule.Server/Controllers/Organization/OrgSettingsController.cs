using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Organization;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Organization
{
    /// <summary>
    /// Read/write per-organization preferences that affect booking windows,
    /// business hours, timezone/locale, and notifications.
    /// Authoritative booking fields: <see cref="OrganizationSettings.MinLeadMinutes"/>
    /// and <see cref="OrganizationSettings.CancelWindowHours"/>.
    /// </summary>
    [ApiController]
    [Route("api/org-settings")]
    [Authorize]
    public sealed class OrgSettingsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrgSettingsController"/>.
        /// </summary>
        public OrgSettingsController(ApplicationDbContext db) => _db = db;

        /// <summary>Returns the current organization's settings (creating defaults on first access).</summary>
        [HttpGet]
        [ProducesResponseType(typeof(OrgSettingsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<OrgSettingsDto>> Get(CancellationToken ct)
        {
            var s = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (s is null)
            {
                s = new OrganizationSettings { OrganizationId = OrganizationId };
                _db.OrganizationSettings.Add(s);
                await _db.SaveChangesAsync(ct);
            }

            return Ok(ToDto(s));
        }

        /// <summary>
        /// Partially updates the current organization's settings.
        /// Only provided fields are applied; out-of-range values are clamped.
        /// </summary>
        [HttpPut]
        [Authorize(Roles = "Manager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Update([FromBody] UpdateOrgSettingsDto dto, CancellationToken ct)
        {
            var s = await _db.OrganizationSettings
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (s is null)
            {
                s = new OrganizationSettings { OrganizationId = OrganizationId };
                _db.OrganizationSettings.Add(s);
            }

            // Booking windows
            if (dto.MinLeadMinutes.HasValue)
                s.MinLeadMinutes = Clamp(dto.MinLeadMinutes.Value, 0, 10080); // up to 7 days

            if (dto.CancelWindowHours.HasValue)
                s.CancelWindowHours = Clamp(dto.CancelWindowHours.Value, 0, 168); // up to 7 days

            // Business hours
            if (!string.IsNullOrWhiteSpace(dto.BusinessHoursStartLocal))
                s.BusinessHoursStartLocal = TimeSpan.Parse(dto.BusinessHoursStartLocal!);

            if (!string.IsNullOrWhiteSpace(dto.BusinessHoursEndLocal))
                s.BusinessHoursEndLocal = TimeSpan.Parse(dto.BusinessHoursEndLocal!);

            // Override confirmation policy
            if (dto.RequireConfirmOnOverrides.HasValue)
                s.RequireConfirmOnOverrides = dto.RequireConfirmOnOverrides.Value;

            // Locale / timezone
            if (!string.IsNullOrWhiteSpace(dto.TimeZoneId) && dto.TimeZoneId.Length <= 64)
                s.TimeZoneId = dto.TimeZoneId;

            if (!string.IsNullOrWhiteSpace(dto.Locale) && dto.Locale.Length <= 16)
                s.Locale = dto.Locale;

            // Notifications
            if (dto.EmailEnabled.HasValue) s.EmailEnabled = dto.EmailEnabled.Value;
            if (dto.SmsEnabled.HasValue) s.SmsEnabled = dto.SmsEnabled.Value;
            if (dto.SendBookingConfirmation.HasValue) s.SendBookingConfirmation = dto.SendBookingConfirmation.Value;
            if (dto.ReminderHoursBefore.HasValue) s.ReminderHoursBefore = Math.Max(0, dto.ReminderHoursBefore.Value);

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // --------------------------
        // Mapping
        // --------------------------

        private static OrgSettingsDto ToDto(OrganizationSettings s) => new()
        {
            MinLeadMinutes = s.MinLeadMinutes,
            CancelWindowHours = s.CancelWindowHours,

            // Business hours
            BusinessHoursStartLocal = s.BusinessHoursStartLocal.ToString(@"hh\:mm\:ss"),
            BusinessHoursEndLocal = s.BusinessHoursEndLocal.ToString(@"hh\:mm\:ss"),

            // Policy
            RequireConfirmOnOverrides = s.RequireConfirmOnOverrides,

            // Locale / time
            TimeZoneId = s.TimeZoneId,
            Locale = s.Locale,

            // Notifications
            EmailEnabled = s.EmailEnabled,
            SmsEnabled = s.SmsEnabled,
            SendBookingConfirmation = s.SendBookingConfirmation,
            ReminderHoursBefore = s.ReminderHoursBefore
        };

        // --------------------------
        // Helpers
        // --------------------------

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
    }
}
