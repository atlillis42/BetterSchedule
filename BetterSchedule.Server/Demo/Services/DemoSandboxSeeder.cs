using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Access;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Services.Demo
{
    /// <summary>
    /// Demo-only seeder used by the SandboxService to populate a new Organization with the
    /// same "org_1" dataset you use in DbInitializer — minus any secondary organization.
    /// The provided seed user is wired in as a Manager + ServiceProvider and appears
    /// clearly on the seeded calendar events.
    /// </summary>
    public sealed class DemoSandboxSeeder : IDemoSandboxSeeder
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        /// <summary>Constructs a new <see cref="DemoSandboxSeeder"/>.</summary>
        public DemoSandboxSeeder(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        /// <inheritdoc />
        public async Task SeedForSandboxOrgAsync(string organizationId, string ephemeralUserId, DateTimeOffset? nowUtc, CancellationToken ct)
        {
            var now = nowUtc ?? DateTimeOffset.UtcNow;

            // Ensure roles
            await EnsureRoleAsync("Manager", ct);
            await EnsureRoleAsync("ServiceProvider", ct);
            await EnsureRoleAsync("Client", ct);

            // Get seed user and ensure roles
            var demoUser = await _userManager.FindByIdAsync(ephemeralUserId)
                ?? throw new InvalidOperationException("Seed user not found.");

            if (!await _userManager.IsInRoleAsync(demoUser, "Manager"))
                await _userManager.AddToRoleAsync(demoUser, "Manager");
            if (!await _userManager.IsInRoleAsync(demoUser, "ServiceProvider"))
                await _userManager.AddToRoleAsync(demoUser, "ServiceProvider");

            // Settings (mirrors org_1 defaults)
            var settings = await _db.OrganizationSettings
                .FirstOrDefaultAsync(x => x.OrganizationId == organizationId, ct);

            if (settings is null)
            {
                settings = new OrganizationSettings
                {
                    OrganizationId = organizationId,
                    MinLeadMinutes = 60,
                    CancelWindowHours = 24,
                    BusinessHoursStartLocal = new TimeSpan(8, 0, 0),
                    BusinessHoursEndLocal = new TimeSpan(18, 0, 0),
                    RequireConfirmOnOverrides = true,
                    TimeZoneId = "America/New_York",
                    Locale = "en-US",
                    EmailEnabled = false,
                    SmsEnabled = false,
                    SendBookingConfirmation = false,
                    ReminderHoursBefore = null
                };
                _db.OrganizationSettings.Add(settings);
                await _db.SaveChangesAsync(ct);
            }
            var tzId = settings.TimeZoneId ?? "America/New_York";

            // Additional users
            var bob = await EnsureDemoMemberAsync(organizationId, "bob.demo", "Bob Brown", "ServiceProvider", ct);
            var carla = await EnsureDemoMemberAsync(organizationId, "carla.demo", "Carla Chen", "Client", ct);
            var mike = await EnsureDemoMemberAsync(organizationId, "mike.demo", "Mike Miller", "Client", ct);
            var nina = await EnsureDemoMemberAsync(organizationId, "nina.demo", "Nina Nguyen", "Client", ct);

            // Ensure the seed user is also a client member (idempotent)
            if (!await _db.ClientOrganizations.AnyAsync(co =>
                    co.OrganizationId == organizationId && co.ClientId == demoUser.Id, ct))
            {
                _db.ClientOrganizations.Add(new ClientOrganization
                {
                    OrganizationId = organizationId,
                    ClientId = demoUser.Id
                });
            }

            // Resources
            var arena = await EnsureResourceAsync(organizationId, "Main Arena", "#ff7373", ct);
            var studio2 = await EnsureResourceAsync(organizationId, "Studio 2", "#73cfff", ct);
            var outdoor = await EnsureResourceAsync(organizationId, "Outdoor Field", "#b5e48c", ct);

            // Appointment Types
            var yogaType = await EnsureAppointmentTypeAsync(
                organizationId, "Yoga Class", TimeSpan.FromMinutes(60), 18.50m,
                "Group yoga for all levels.", demoUser.Id, arena.Id, isPublic: true, requiresWaiver: true, ct);

            var massageType = await EnsureAppointmentTypeAsync(
                organizationId, "Therapeutic Massage", TimeSpan.FromMinutes(90), 65.00m,
                "Full-body massage.", bob.Id, studio2.Id, isPublic: true, requiresWaiver: false, ct);

            var soccerType = await EnsureAppointmentTypeAsync(
                organizationId, "Youth Soccer Clinic", TimeSpan.FromMinutes(120), 25.00m,
                "Ages 7-13 skills & games.", demoUser.Id, outdoor.Id, isPublic: true, requiresWaiver: false, ct);

            var privateType = await EnsureAppointmentTypeAsync(
                organizationId, "Private Training", TimeSpan.FromMinutes(45), 40.00m,
                "One-on-one coaching.", demoUser.Id, arena.Id, isPublic: false, requiresWaiver: false, ct);

            var acupunctureType = await EnsureAppointmentTypeAsync(
                organizationId, "Acupuncture Session", TimeSpan.FromMinutes(60), 55.00m,
                "Traditional acupuncture session.", demoUser.Id, studio2.Id, isPublic: true, requiresWaiver: false, ct);

            // Optional Access Links
            AddProviderResourceAccess(organizationId, demoUser.Id, arena.Id);
            AddProviderResourceAccess(organizationId, demoUser.Id, studio2.Id);
            AddProviderResourceAccess(organizationId, demoUser.Id, outdoor.Id);
            AddProviderResourceAccess(organizationId, bob.Id, studio2.Id);

            AddProviderAppointmentTypeAccess(organizationId, demoUser.Id, yogaType.Id);
            AddProviderAppointmentTypeAccess(organizationId, demoUser.Id, soccerType.Id);
            AddProviderAppointmentTypeAccess(organizationId, demoUser.Id, privateType.Id);
            AddProviderAppointmentTypeAccess(organizationId, demoUser.Id, acupunctureType.Id);
            AddProviderAppointmentTypeAccess(organizationId, bob.Id, massageType.Id);

            AddAppointmentTypeResourceAccess(organizationId, yogaType.Id, arena.Id);
            AddAppointmentTypeResourceAccess(organizationId, massageType.Id, studio2.Id);
            AddAppointmentTypeResourceAccess(organizationId, soccerType.Id, outdoor.Id);
            AddAppointmentTypeResourceAccess(organizationId, privateType.Id, arena.Id);
            AddAppointmentTypeResourceAccess(organizationId, acupunctureType.Id, studio2.Id);

            await _db.SaveChangesAsync(ct);

            // Reservations & Blocked Times
            DateOnly todayLocal = LocalToday(now, tzId);
            DateTimeOffset L(int daysFromToday, int hour, int minute = 0) =>
                AtLocal(now, tzId, todayLocal, daysFromToday, hour, minute);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, yogaType.Id,
                L(-7, 9), L(-7, 10), arena.Id, ReservationStatus.Completed,
                "Completed past yoga session.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, bob.Id, massageType.Id,
                L(-3, 14), L(-3, 15).AddMinutes(30), studio2.Id, ReservationStatus.NoShow,
                "Missed massage, client did not show.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                L(0, 17), L(0, 19), outdoor.Id, ReservationStatus.Booked,
                "Kids' soccer clinic.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                L(2, 10), L(2, 12), outdoor.Id, ReservationStatus.Booked,
                "Morning soccer camp, outdoor.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, privateType.Id,
                L(10, 16), L(10, 16).AddMinutes(45), arena.Id, ReservationStatus.Canceled,
                "Cancelled by client.", now, ct);

            for (int i = 0; i < 7; i++)
            {
                await AddReservationAsync(organizationId, mike.Id, bob.Id, massageType.Id,
                    L(i, 11), L(i, 12), studio2.Id, ReservationStatus.Booked,
                    "Daily massage demo slot.", now, ct, allowDuplicate: false);
            }

            await AddReservationAsync(organizationId, mike.Id, demoUser.Id, acupunctureType.Id,
                L(1, 9), L(1, 10), studio2.Id, ReservationStatus.Booked,
                "Initial consult + acupuncture.", now, ct);

            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, acupunctureType.Id,
                L(2, 13), L(2, 14), studio2.Id, ReservationStatus.Booked,
                "Stress relief session.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, privateType.Id,
                L(3, 16), L(3, 17), arena.Id, ReservationStatus.Booked,
                "Core strength training.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, acupunctureType.Id,
                L(-1, 15), L(-1, 16), studio2.Id, ReservationStatus.Completed,
                "Follow-up acupuncture session.", now, ct);

            await AddBlockedTimeAsync(organizationId, arena.Id, "Floor waxing",
                L(1, 12), L(1, 15), "#cccccc", demoUser.Id, ct);

            await AddBlockedTimeAsync(organizationId, arena.Id, "Private booking",
                L(5, 18), L(5, 21), "#fcba03", bob.Id, ct);

            // Completed — Today 8:00–9:00 local, Yoga in Arena (Nina with Demo user)
            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, yogaType.Id,
                L(0, 8), L(0, 9), arena.Id, ReservationStatus.Completed,
                "Morning yoga — completed (demo).", now, ct);

            // Canceled — Tomorrow 15:00–15:45 local, Private Training in Arena (Mike with Demo user)
            await AddReservationAsync(organizationId, mike.Id, demoUser.Id, privateType.Id,
                L(1, 15), L(1, 15).AddMinutes(45), arena.Id, ReservationStatus.Canceled,
                "Client canceled (demo).", now, ct);

            // NoShow — Day Before 9:00–10:00 local, Massage in Studio 2 (Carla with Bob)
            await AddReservationAsync(organizationId, carla.Id, bob.Id, massageType.Id,
                L(-1, 9), L(-1, 10), studio2.Id, ReservationStatus.NoShow,
                "Client did not attend (demo).", now, ct);
        }

        private async Task EnsureRoleAsync(string roleName, CancellationToken ct)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        private static DateOnly LocalToday(DateTimeOffset nowValue, string tzId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localNow = TimeZoneInfo.ConvertTime(nowValue, tz);
            return DateOnly.FromDateTime(localNow.Date);
        }

        private static DateTimeOffset AtLocal(DateTimeOffset nowValue, string tzId, DateOnly baseLocalDay, int daysFromToday, int hour, int minute = 0)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localDateTime = baseLocalDay.AddDays(daysFromToday).ToDateTime(new TimeOnly(hour, minute));
            var unspecified = DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified);
            var offset = tz.GetUtcOffset(unspecified);
            return new DateTimeOffset(unspecified, offset);
        }

        private async Task<ApplicationUser> EnsureDemoMemberAsync(
            string organizationId,
            string userName,
            string fullName,
            string role,
            CancellationToken ct)
        {
            var existing = await _db.Users
                .FirstOrDefaultAsync(u => u.OrganizationId == organizationId && u.UserName == userName, ct);

            if (existing is null)
            {
                var u = new ApplicationUser
                {
                    UserName = userName,
                    Email = null,
                    EmailConfirmed = true,
                    OrganizationId = organizationId,
                    FullName = fullName,
                    IsDeleted = false
                };
                _db.Users.Add(u);
                await _db.SaveChangesAsync(ct);

                var managed = await _userManager.FindByIdAsync(u.Id);
                if (managed != null && !await _userManager.IsInRoleAsync(managed, role))
                {
                    await _userManager.AddToRoleAsync(managed, role);
                }
                return u;
            }
            else
            {
                return existing;
            }
        }

        private async Task<CalendarResource> EnsureResourceAsync(
            string organizationId, string name, string? backColor, CancellationToken ct)
        {
            var res = await _db.CalendarResources
                .FirstOrDefaultAsync(r => r.OrganizationId == organizationId && r.Name == name, ct);

            if (res is null)
            {
                res = new CalendarResource
                {
                    OrganizationId = organizationId,
                    Name = name,
                    BackColor = backColor,
                    IsDeleted = false
                };
                _db.CalendarResources.Add(res);
                await _db.SaveChangesAsync(ct);
            }
            return res;
        }

        private async Task<AppointmentType> EnsureAppointmentTypeAsync(
            string organizationId,
            string name,
            TimeSpan duration,
            decimal price,
            string? description,
            string createdByUserId,
            int? assignedResourceId,
            bool isPublic,
            bool requiresWaiver,
            CancellationToken ct)
        {
            var type = await _db.AppointmentTypes
                .FirstOrDefaultAsync(a => a.OrganizationId == organizationId && a.Name == name, ct);

            if (type is null)
            {
                type = new AppointmentType
                {
                    OrganizationId = organizationId,
                    Name = name,
                    Duration = duration,
                    Price = price,
                    Description = description,
                    CreatedByUserId = createdByUserId,
                    AssignedResourceId = assignedResourceId,
                    IsPublic = isPublic,
                    RequiresWaiver = requiresWaiver,
                    IsDeleted = false
                };
                _db.AppointmentTypes.Add(type);
                await _db.SaveChangesAsync(ct);
            }
            return type;
        }

        private void AddProviderResourceAccess(string orgId, string userId, int resourceId)
        {
            _db.ProviderResourceAccesses.Add(new ProviderResourceAccess
            {
                OrganizationId = orgId,
                UserId = userId,
                ResourceId = resourceId,
                IsDeleted = false
            });
        }

        private void AddProviderAppointmentTypeAccess(string orgId, string userId, int appointmentTypeId)
        {
            _db.ProviderAppointmentTypeAccesses.Add(new ProviderAppointmentTypeAccess
            {
                OrganizationId = orgId,
                UserId = userId,
                AppointmentTypeId = appointmentTypeId,
                IsDeleted = false
            });
        }

        private void AddAppointmentTypeResourceAccess(string orgId, int appointmentTypeId, int resourceId)
        {
            _db.AppointmentTypeResourceAccesses.Add(new AppointmentTypeResourceAccess
            {
                OrganizationId = orgId,
                AppointmentTypeId = appointmentTypeId,
                ResourceId = resourceId,
                IsDeleted = false
            });
        }

        private async Task AddReservationAsync(
            string organizationId,
            string clientId,
            string providerId,
            int typeId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            ReservationStatus status,
            string? notes,
            DateTimeOffset nowValue,
            CancellationToken ct,
            bool allowDuplicate = false)
        {
            if (!allowDuplicate)
            {
                var exists = await _db.Reservations.AnyAsync(r =>
                    r.OrganizationId == organizationId &&
                    r.ClientId == clientId &&
                    r.ServiceProviderId == providerId &&
                    r.AppointmentTypeId == typeId &&
                    r.StartTime == start &&
                    r.EndTime == end, ct);

                if (exists) return;
            }

            _db.Reservations.Add(new Reservation
            {
                OrganizationId = organizationId,
                ClientId = clientId,
                ServiceProviderId = providerId,
                AppointmentTypeId = typeId,
                StartTime = start,
                EndTime = end,
                ResourceId = resourceId,
                Status = status,
                Notes = notes,
                CreatedAt = nowValue,
                IsDeleted = false
            });
            await _db.SaveChangesAsync(ct);
        }

        private async Task AddBlockedTimeAsync(
            string organizationId,
            int resourceId,
            string reason,
            DateTimeOffset start,
            DateTimeOffset end,
            string? backColor,
            string createdByUserId,
            CancellationToken ct)
        {
            var exists = await _db.BlockedTimes.AnyAsync(b =>
                b.OrganizationId == organizationId &&
                b.ResourceId == resourceId &&
                b.Reason == reason &&
                b.StartTime == start &&
                b.EndTime == end, ct);

            if (exists) return;

            _db.BlockedTimes.Add(new BlockedTime
            {
                OrganizationId = organizationId,
                ResourceId = resourceId,
                Reason = reason,
                StartTime = start,
                EndTime = end,
                BackColor = backColor,
                CreatedByUserId = createdByUserId,
                IsDeleted = false
            });
            await _db.SaveChangesAsync(ct);
        }
    }
}
