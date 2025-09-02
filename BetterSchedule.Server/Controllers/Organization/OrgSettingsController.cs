using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Organization;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Organization
{
    /// <summary>
    /// Read/write per-organization preferences that affect calendar display,
    /// booking policy, availability enforcement, timezone/locale, and notifications.
    /// Uses the authoritative booking fields: <see cref="OrganizationSettings.MinLeadMinutes"/>
    /// and <see cref="OrganizationSettings.CancelWindowHours"/>.
    /// </summary>
    [ApiController]
    [Route("api/org-settings")]
    [Authorize(Roles = "Manager")]
    public sealed class OrgSettingsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
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
        /// Only provided fields are applied. Enum parsing is case-insensitive.
        /// </summary>
        [HttpPut]
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

            // Cancel policies
            if (!string.IsNullOrWhiteSpace(dto.ProviderCancelPolicy) &&
                EnumTryParse(dto.ProviderCancelPolicy, out ProviderCancelPolicy pcp))
                s.ProviderCancelPolicy = pcp;

            if (!string.IsNullOrWhiteSpace(dto.ClientCancelPolicy) &&
                EnumTryParse(dto.ClientCancelPolicy, out ClientCancelPolicy ccp))
                s.ClientCancelPolicy = ccp;

            // Calendar display
            if (dto.ShowWeekends.HasValue) s.ShowWeekends = dto.ShowWeekends.Value;
            if (dto.StartOfWeek.HasValue) s.StartOfWeek = Clamp(dto.StartOfWeek.Value, 0, 6);
            if (!string.IsNullOrWhiteSpace(dto.BusinessHoursStartLocal)) s.BusinessHoursStartLocal = TimeSpan.Parse(dto.BusinessHoursStartLocal!);
            if (!string.IsNullOrWhiteSpace(dto.BusinessHoursEndLocal)) s.BusinessHoursEndLocal = TimeSpan.Parse(dto.BusinessHoursEndLocal!);
            if (!string.IsNullOrWhiteSpace(dto.DefaultView) && EnumTryParse(dto.DefaultView, out DefaultCalendarView dv)) s.DefaultView = dv;

            // Availability policy & visuals
            if (!string.IsNullOrWhiteSpace(dto.ShadingMode) && EnumTryParse(dto.ShadingMode, out CalendarShadingMode sm)) s.ShadingMode = sm;
            if (!string.IsNullOrWhiteSpace(dto.AvailabilityEnforcement) && EnumTryParse(dto.AvailabilityEnforcement, out AvailabilityEnforcement ae)) s.AvailabilityEnforcement = ae;
            if (dto.RequireConfirmOnOverrides.HasValue) s.RequireConfirmOnOverrides = dto.RequireConfirmOnOverrides.Value;
            if (dto.AvailabilityPublic.HasValue) s.AvailabilityPublic = dto.AvailabilityPublic.Value;
            if (dto.ProvidersCanEditOwnAvailability.HasValue) s.ProvidersCanEditOwnAvailability = dto.ProvidersCanEditOwnAvailability.Value;

            // Locale / timezone
            if (!string.IsNullOrWhiteSpace(dto.TimeZoneId) && dto.TimeZoneId.Length <= 64) s.TimeZoneId = dto.TimeZoneId;
            if (!string.IsNullOrWhiteSpace(dto.Locale) && dto.Locale.Length <= 16) s.Locale = dto.Locale;

            // Notifications
            if (dto.EmailEnabled.HasValue) s.EmailEnabled = dto.EmailEnabled.Value;
            if (dto.SmsEnabled.HasValue) s.SmsEnabled = dto.SmsEnabled.Value;
            if (dto.SendBookingConfirmation.HasValue) s.SendBookingConfirmation = dto.SendBookingConfirmation.Value;
            if (dto.ReminderHoursBefore.HasValue) s.ReminderHoursBefore = Math.Max(0, dto.ReminderHoursBefore.Value);

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // Mapping

        private static OrgSettingsDto ToDto(OrganizationSettings s) => new()
        {
            MinLeadMinutes = s.MinLeadMinutes,
            CancelWindowHours = s.CancelWindowHours,

            ProviderCancelPolicy = s.ProviderCancelPolicy.ToString(),
            ClientCancelPolicy = s.ClientCancelPolicy.ToString(),

            ShowWeekends = s.ShowWeekends,
            StartOfWeek = s.StartOfWeek,
            BusinessHoursStartLocal = s.BusinessHoursStartLocal.ToString(@"hh\:mm\:ss"),
            BusinessHoursEndLocal = s.BusinessHoursEndLocal.ToString(@"hh\:mm\:ss"),
            DefaultView = s.DefaultView.ToString(),

            ShadingMode = s.ShadingMode.ToString(),
            AvailabilityEnforcement = s.AvailabilityEnforcement.ToString(),
            RequireConfirmOnOverrides = s.RequireConfirmOnOverrides,
            AvailabilityPublic = s.AvailabilityPublic,
            ProvidersCanEditOwnAvailability = s.ProvidersCanEditOwnAvailability,

            TimeZoneId = s.TimeZoneId,
            Locale = s.Locale,

            EmailEnabled = s.EmailEnabled,
            SmsEnabled = s.SmsEnabled,
            SendBookingConfirmation = s.SendBookingConfirmation,
            ReminderHoursBefore = s.ReminderHoursBefore
        };

        // Helpers

        private static bool EnumTryParse<T>(string value, out T parsed) where T : struct, Enum
            => Enum.TryParse(value, ignoreCase: true, out parsed);

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
    }
}
