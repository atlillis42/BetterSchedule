using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.DevTools.Seeding
{
    internal static class BaseSeed
    {
        public static async Task ApplyAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            SeedOptions options)
        {
            // Org + settings
            var org = await EnsureOrganizationAsync(db, "base-org", "Acme Demo Org");
            await EnsureOrgSettingsAsync(db, org.Id, "America/New_York", "en-US",
                businessStart: new TimeSpan(9, 0, 0), businessEnd: new TimeSpan(17, 0, 0));

            // === Dev identities (single source of truth) ===
            var admin = await EnsureUserAsync(userManager, "admin@dev.local", "admin@dev.local", org.Id, "Devpass123!", new[] { "Manager", "ServiceProvider", "Client" }, availabilityPublic: true);
            var provider = await EnsureUserAsync(userManager, "provider@dev.local", "provider@dev.local", org.Id, "Devpass123!", new[] { "ServiceProvider" }, availabilityPublic: true);
            var client = await EnsureUserAsync(userManager, "client@dev.local", "client@dev.local", org.Id, "Devpass123!", new[] { "Client" }, availabilityPublic: false);

            // Resource + appointment types
            var room1 = await EnsureResourceAsync(db, org.Id, "Room 1", "#E5E7EB");
            var consult = await EnsureTypeAsync(db, org.Id, "Consultation", TimeSpan.FromMinutes(60), 100m, "Initial consult",
                                                 createdBy: admin.Id, assignedResourceId: room1.Id, isPublic: true, requiresWaiver: false);
            var followUp = await EnsureTypeAsync(db, org.Id, "Follow-up", TimeSpan.FromMinutes(30), 60m, "30 min follow-up",
                                                 createdBy: admin.Id, assignedResourceId: room1.Id, isPublic: true, requiresWaiver: false);

            // Availability (provider Mon–Fri 09–17)
            var anchor = ResolveAnchor(options, "America/New_York");
            var far = new DateOnly(2099, 12, 31);
            foreach (var dow in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday })
                await EnsureAvailabilityAsync(db, org.Id, provider.Id, dow, new TimeSpan(9, 0, 0), new TimeSpan(17, 0, 0), anchor, far);

            // Few deterministic reservations (simple & valid)
            var tzId = await db.OrganizationSettings.Where(s => s.OrganizationId == org.Id).Select(s => s.TimeZoneId).FirstAsync();
            var weekStart = StartOfWeek(anchor, DayOfWeek.Monday);

            // 1) Past completed (client with provider)
            await EnsureReservationAsync(db, org.Id, client.Id, provider.Id, consult.Id,
                AtLocal(tzId, weekStart.AddDays(-2), 10, 0), AtLocal(tzId, weekStart.AddDays(-2), 11, 0),
                room1.Id, ReservationStatus.Completed, "Past completed consult");

            // 2) Upcoming booked (client with provider)
            await EnsureReservationAsync(db, org.Id, client.Id, provider.Id, consult.Id,
                AtLocal(tzId, weekStart.AddDays(1), 10, 0), AtLocal(tzId, weekStart.AddDays(1), 11, 0),
                room1.Id, ReservationStatus.Booked, "Upcoming consult");

            // 3) Future canceled (admin as client to demo status handling)
            await EnsureReservationAsync(db, org.Id, admin.Id, provider.Id, followUp.Id,
                AtLocal(tzId, weekStart.AddDays(3), 14, 0), AtLocal(tzId, weekStart.AddDays(3), 14, 30),
                room1.Id, ReservationStatus.Canceled, "Canceled follow-up");
        }

        private static DateOnly ResolveAnchor(SeedOptions o, string tzId)
        {
            if (o.Profile == SeedProfile.Base && !o.RollingDates)
                return o.AnchorLocalDate ?? new DateOnly(2025, 1, 6); // Monday
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz);
            return DateOnly.FromDateTime(localNow.Date);
        }

        private static DateOnly StartOfWeek(DateOnly date, DayOfWeek start) => date.AddDays(-((7 + (date.DayOfWeek - start)) % 7));

        private static DateTimeOffset AtLocal(string tzId, DateOnly day, int hour, int minute)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var local = day.ToDateTime(new TimeOnly(hour, minute));
            var un = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
            return new DateTimeOffset(un, tz.GetUtcOffset(un));
        }

        // --- Upserts ---
        private static async Task<Organization> EnsureOrganizationAsync(ApplicationDbContext db, string id, string name)
        {
            var org = await db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
            if (org is null) { org = new Organization { Id = id, Name = name }; db.Organizations.Add(org); await db.SaveChangesAsync(); }
            else if (org.Name != name) { org.Name = name; await db.SaveChangesAsync(); }
            return org;
        }

        private static async Task EnsureOrgSettingsAsync(ApplicationDbContext db, string orgId, string tzId, string locale, TimeSpan businessStart, TimeSpan businessEnd)
        {
            var s = await db.OrganizationSettings.FirstOrDefaultAsync(x => x.OrganizationId == orgId);
            if (s is null)
            {
                s = new OrganizationSettings
                {
                    OrganizationId = orgId,
                    TimeZoneId = tzId,
                    Locale = locale,
                    BusinessHoursStartLocal = businessStart,
                    BusinessHoursEndLocal = businessEnd,
                    StartOfWeek = 1,
                    ShowWeekends = true,
                    DefaultView = DefaultCalendarView.Week,
                    MinLeadMinutes = 0,
                    CancelWindowHours = 0,
                    ShadingMode = CalendarShadingMode.ProviderAvailability,
                    AvailabilityEnforcement = AvailabilityEnforcement.Warn,
                    RequireConfirmOnOverrides = true,
                    AvailabilityPublic = true,
                    ProvidersCanEditOwnAvailability = true
                };
                db.OrganizationSettings.Add(s);
                await db.SaveChangesAsync();
            }
        }

        private static async Task<ApplicationUser> EnsureUserAsync(
            UserManager<ApplicationUser> um,
            string userName, string email, string orgId, string password, string[] roles, bool availabilityPublic)
        {
            var u = await um.FindByNameAsync(userName) ?? await um.FindByEmailAsync(email);
            if (u is null)
            {
                u = new ApplicationUser { UserName = userName, Email = email, EmailConfirmed = true, OrganizationId = orgId, AvailabilityPublic = availabilityPublic };
                await um.CreateAsync(u, password);
            }
            else
            {
                var changed = false;
                if (u.OrganizationId != orgId) { u.OrganizationId = orgId; changed = true; }
                if (u.AvailabilityPublic != availabilityPublic) { u.AvailabilityPublic = availabilityPublic; changed = true; }
                if (changed) await um.UpdateAsync(u);
            }

            foreach (var role in roles)
                if (!await um.IsInRoleAsync(u, role))
                    await um.AddToRoleAsync(u, role);

            return u;
        }

        private static async Task<CalendarResource> EnsureResourceAsync(ApplicationDbContext db, string orgId, string name, string? backColor)
        {
            var r = await db.CalendarResources.FirstOrDefaultAsync(x => x.OrganizationId == orgId && x.Name == name);
            if (r is null) { r = new CalendarResource { OrganizationId = orgId, Name = name, BackColor = backColor, IsDeleted = false }; db.CalendarResources.Add(r); await db.SaveChangesAsync(); }
            else if (r.BackColor != backColor) { r.BackColor = backColor; await db.SaveChangesAsync(); }
            return r;
        }

        private static async Task<AppointmentType> EnsureTypeAsync(
            ApplicationDbContext db, string orgId, string name, TimeSpan duration, decimal price, string? desc,
            string createdBy, int? assignedResourceId, bool isPublic, bool requiresWaiver)
        {
            var t = await db.AppointmentTypes.FirstOrDefaultAsync(x => x.OrganizationId == orgId && x.Name == name);
            if (t is null)
            {
                t = new AppointmentType
                {
                    OrganizationId = orgId,
                    Name = name,
                    Duration = duration,
                    Price = price,
                    Description = desc,
                    CreatedByUserId = createdBy,
                    AssignedResourceId = assignedResourceId,
                    IsPublic = isPublic,
                    RequiresWaiver = requiresWaiver,
                    IsDeleted = false
                };
                db.AppointmentTypes.Add(t); await db.SaveChangesAsync();
            }
            else
            {
                var changed = false;
                if (t.Duration != duration) { t.Duration = duration; changed = true; }
                if (t.Price != price) { t.Price = price; changed = true; }
                if (t.Description != desc) { t.Description = desc; changed = true; }
                if (t.AssignedResourceId != assignedResourceId) { t.AssignedResourceId = assignedResourceId; changed = true; }
                if (t.IsPublic != isPublic) { t.IsPublic = isPublic; changed = true; }
                if (t.RequiresWaiver != requiresWaiver) { t.RequiresWaiver = requiresWaiver; changed = true; }
                if (changed) await db.SaveChangesAsync();
            }
            return t;
        }

        private static async Task EnsureAvailabilityAsync(
            ApplicationDbContext db, string orgId, string providerId, DayOfWeek dow, TimeSpan start, TimeSpan end, DateOnly from, DateOnly to)
        {
            var exists = await db.ProviderAvailabilities.AnyAsync(a =>
                a.OrganizationId == orgId && a.ServiceProviderId == providerId && a.DayOfWeek == dow &&
                a.StartLocalTime == start && a.EndLocalTime == end && a.EffectiveFrom == from && a.EffectiveTo == to && !a.IsDeleted);
            if (exists) return;

            db.ProviderAvailabilities.Add(new ProviderAvailability
            {
                OrganizationId = orgId,
                ServiceProviderId = providerId,
                DayOfWeek = dow,
                StartLocalTime = start,
                EndLocalTime = end,
                EffectiveFrom = from,
                EffectiveTo = to,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
        }

        private static async Task EnsureReservationAsync(
            ApplicationDbContext db, string orgId, string clientId, string providerId, int typeId,
            DateTimeOffset start, DateTimeOffset end, int? resourceId, ReservationStatus status, string? notes)
        {
            var exists = await db.Reservations.AnyAsync(r =>
                r.OrganizationId == orgId && r.ClientId == clientId && r.ServiceProviderId == providerId &&
                r.AppointmentTypeId == typeId && r.StartTime == start && r.EndTime == end);
            if (exists) return;

            db.Reservations.Add(new Reservation
            {
                OrganizationId = orgId,
                ClientId = clientId,
                ServiceProviderId = providerId,
                AppointmentTypeId = typeId,
                StartTime = start,
                EndTime = end,
                ResourceId = resourceId,
                Status = status,
                Notes = notes,
                CreatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
        }
    }
}
