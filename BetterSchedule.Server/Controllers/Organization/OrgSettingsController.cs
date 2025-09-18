using System;
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
    [Authorize]
    public sealed class OrgSettingsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public OrgSettingsController(ApplicationDbContext db) => _db = db;

        /// <summary>Returns the current organization's settings (creating defaults on first access).</summary>
        [HttpGet]
        [ProducesResponseType(typeof(OrgSettingsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<OrgSettingsDto>> Get(CancellationToken ct)
        {
            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (settings is null)
            {
                settings = new OrganizationSettings { OrganizationId = OrganizationId };
                _db.OrganizationSettings.Add(settings);
                await _db.SaveChangesAsync(ct);
            }

            return Ok(ToDto(settings));
        }

        /// <summary>
        /// Partially updates the current organization's settings.
        /// Only provided fields are applied. All fields are strongly typed.
        /// </summary>
        [HttpPut]
        [Authorize(Roles = "Manager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Update([FromBody] UpdateOrgSettingsDto dto, CancellationToken ct)
        {
            var settings = await _db.OrganizationSettings
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (settings is null)
            {
                settings = new OrganizationSettings { OrganizationId = OrganizationId };
                _db.OrganizationSettings.Add(settings);
            }

            // Booking windows
            if (dto.MinLeadMinutes.HasValue)
                settings.MinLeadMinutes = Clamp(dto.MinLeadMinutes.Value, 0, 10080); // up to 7 days

            if (dto.CancelWindowHours.HasValue)
                settings.CancelWindowHours = Clamp(dto.CancelWindowHours.Value, 0, 168); // up to 7 days

            // Cancel policies (strongly typed)
            if (dto.ProviderCancelPolicy.HasValue)
                settings.ProviderCancelPolicy = dto.ProviderCancelPolicy.Value;

            if (dto.ClientCancelPolicy.HasValue)
                settings.ClientCancelPolicy = dto.ClientCancelPolicy.Value;

            // Calendar display (strongly typed)
            if (dto.ShowWeekends.HasValue) settings.ShowWeekends = dto.ShowWeekends.Value;
            if (dto.StartOfWeek.HasValue) settings.StartOfWeek = Clamp(dto.StartOfWeek.Value, 0, 6);
            if (dto.BusinessHoursStartLocal.HasValue) settings.BusinessHoursStartLocal = dto.BusinessHoursStartLocal.Value;
            if (dto.BusinessHoursEndLocal.HasValue) settings.BusinessHoursEndLocal = dto.BusinessHoursEndLocal.Value;
            if (dto.DefaultView.HasValue) settings.DefaultView = dto.DefaultView.Value;

            // Availability policy & visuals (strongly typed)
            if (dto.ShadingMode.HasValue) settings.ShadingMode = dto.ShadingMode.Value;
            if (dto.AvailabilityEnforcement.HasValue) settings.AvailabilityEnforcement = dto.AvailabilityEnforcement.Value;
            if (dto.RequireConfirmOnOverrides.HasValue) settings.RequireConfirmOnOverrides = dto.RequireConfirmOnOverrides.Value;
            if (dto.AvailabilityPublic.HasValue) settings.AvailabilityPublic = dto.AvailabilityPublic.Value;
            if (dto.ProvidersCanEditOwnAvailability.HasValue) settings.ProvidersCanEditOwnAvailability = dto.ProvidersCanEditOwnAvailability.Value;

            // Timezone & locale
            if (!string.IsNullOrWhiteSpace(dto.TimeZoneId) && dto.TimeZoneId.Length <= 64)
                settings.TimeZoneId = dto.TimeZoneId;

            if (!string.IsNullOrWhiteSpace(dto.Locale) && dto.Locale.Length <= 16)
                settings.Locale = dto.Locale;

            // Notifications
            if (dto.EmailEnabled.HasValue) settings.EmailEnabled = dto.EmailEnabled.Value;
            if (dto.SmsEnabled.HasValue) settings.SmsEnabled = dto.SmsEnabled.Value;
            if (dto.SendBookingConfirmation.HasValue) settings.SendBookingConfirmation = dto.SendBookingConfirmation.Value;
            if (dto.ReminderHoursBefore.HasValue) settings.ReminderHoursBefore = Math.Max(0, dto.ReminderHoursBefore.Value);

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // Mapping

        private static OrgSettingsDto ToDto(OrganizationSettings s) => new()
        {
            MinLeadMinutes = s.MinLeadMinutes,
            CancelWindowHours = s.CancelWindowHours,

            ProviderCancelPolicy = s.ProviderCancelPolicy,
            ClientCancelPolicy = s.ClientCancelPolicy,

            ShowWeekends = s.ShowWeekends,
            StartOfWeek = s.StartOfWeek,
            BusinessHoursStartLocal = s.BusinessHoursStartLocal,
            BusinessHoursEndLocal = s.BusinessHoursEndLocal,
            DefaultView = s.DefaultView,

            ShadingMode = s.ShadingMode,
            AvailabilityEnforcement = s.AvailabilityEnforcement,
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

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
    }
}
