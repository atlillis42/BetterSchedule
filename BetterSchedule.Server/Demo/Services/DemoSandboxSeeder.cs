using System;
using System.Globalization;
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
    /// Demo-only seeder used by the SandboxService to populate a new Organization with sample data.
    /// The provided seed user is wired in as a Manager + ServiceProvider and appears
    /// clearly on the seeded calendar events.
    /// <para>
    /// <b>Week anchoring:</b> Seeding is aligned to a <b>Sunday-anchored WorkWeek</b> model so that when
    /// the local "today" is Sunday, the "current week" being seeded corresponds to the <b>upcoming</b>
    /// Monday–Friday window (matching the UI).
    /// </para>
    /// </summary>
    public sealed class DemoSandboxSeeder : IDemoSandboxSeeder
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        /// <summary>
        /// Constructs a new <see cref="DemoSandboxSeeder"/>.
        /// </summary>
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

            // ----------------------------------------------------------------
            // Reservations & Blocked Times — Sunday-anchored WorkWeek
            // "Current week" = Monday inside the Sunday-anchored week containing local 'today'.
            // Thus, if today is Sunday, current week is the *upcoming* Mon–Fri.
            // ----------------------------------------------------------------
            DateOnly todayLocal = LocalToday(now, tzId);

            // Sunday anchor -> Monday for the visible "current week"
            var sundayAnchorLocal = StartOfWeek(todayLocal, DayOfWeek.Sunday);
            var mondayStartLocal = sundayAnchorLocal.AddDays(1);
            var prevMondayStartLocal = mondayStartLocal.AddDays(-7);
            var nextMondayStartLocal = mondayStartLocal.AddDays(7);

            // Helpers to place items at local times based on a Monday-anchored base
            DateTimeOffset WD(int dayOffsetMon0, int h, int m = 0) =>
                AtLocalWeek(now, tzId, mondayStartLocal, dayOffsetMon0, h, m);
            DateTimeOffset PWD(int dayOffsetMon0, int h, int m = 0) =>
                AtLocalWeek(now, tzId, prevMondayStartLocal, dayOffsetMon0, h, m);
            DateTimeOffset NWD(int dayOffsetMon0, int h, int m = 0) =>
                AtLocalWeek(now, tzId, nextMondayStartLocal, dayOffsetMon0, h, m);

            const int MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;

            // --- LAST WEEK context (Month/Reports look-back) ---
            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, yogaType.Id,
                PWD(MON, 9), PWD(MON, 10), arena.Id, ReservationStatus.Completed,
                "Completed past yoga session.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, bob.Id, massageType.Id,
                PWD(THU, 14), PWD(THU, 15).AddMinutes(30), studio2.Id, ReservationStatus.NoShow,
                "Missed massage, client did not show.", now, ct);

            // --- CURRENT WEEK: a compact mix across Mon–Fri (varied clients/slots/statuses) ---
            var variedSlots = new[]
            {
                // Mon 10:00–11:00 — Mike + Bob (Massage @ Studio 2)
                // Past => Completed, Future => Booked
                new {
                    Day = MON, H1 = 10, M1 = 0, H2 = 11, M2 = 0,
                    Client = mike.Id, Provider = bob.Id, Type = massageType.Id, Res = studio2.Id,
                    PastStatus = ReservationStatus.Completed, FutureStatus = ReservationStatus.Booked,
                    Notes = "Massage — varied demo slot."
                },

                // Wed 14:00–15:00 — Carla + Demo user (Private @ Arena)
                // Past => NoShow, Future => Booked
                new {
                    Day = WED, H1 = 14, M1 = 0, H2 = 15, M2 = 0,
                    Client = carla.Id, Provider = demoUser.Id, Type = privateType.Id, Res = arena.Id,
                    PastStatus = ReservationStatus.NoShow, FutureStatus = ReservationStatus.Booked,
                    Notes = "Private training — varied demo slot."
                },

                // Thu 10:00–11:00 — Nina + Demo user (Acupuncture @ Studio 2)
                // Keep Booked regardless (fits before the Arena 12–15 block)
                new {
                    Day = THU, H1 = 10, M1 = 0, H2 = 11, M2 = 0,
                    Client = nina.Id, Provider = demoUser.Id, Type = acupunctureType.Id, Res = studio2.Id,
                    PastStatus = ReservationStatus.Booked, FutureStatus = ReservationStatus.Booked,
                    Notes = "Pre-lunch acupuncture (demo)."
                },

                // Fri 13:00–14:00 — Mike + Bob (Massage @ Studio 2)
                new {
                    Day = FRI, H1 = 13, M1 = 0, H2 = 14, M2 = 0,
                    Client = mike.Id, Provider = bob.Id, Type = massageType.Id, Res = studio2.Id,
                    PastStatus = ReservationStatus.Booked, FutureStatus = ReservationStatus.Booked,
                    Notes = "Quick massage before weekend (demo)."
                },
            };

            foreach (var s in variedSlots)
            {
                var start = WD(s.Day, s.H1, s.M1);
                var end = WD(s.Day, s.H2, s.M2);

                // Time-aware status so demos feel realistic
                var status = start <= now ? s.PastStatus : s.FutureStatus;

                await AddReservationAsync(
                    organizationId,
                    s.Client,
                    s.Provider,
                    s.Type,
                    start,
                    end,
                    s.Res,
                    status,
                    s.Notes,
                    now,
                    ct,
                    allowDuplicate: false
                );
            }

            // Status representation across weekdays:
            // Completed — Wednesday 08:00–09:00 (shows "completed" in current week)
            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, yogaType.Id,
                WD(WED, 8), WD(WED, 9), arena.Id, ReservationStatus.Completed,
                "Morning yoga — completed (demo).", now, ct);

            // NoShow — Tuesday 09:00–10:00
            await AddReservationAsync(organizationId, carla.Id, bob.Id, massageType.Id,
                WD(TUE, 9), WD(TUE, 10), studio2.Id, ReservationStatus.NoShow,
                "Client did not attend (demo).", now, ct);

            // Canceled — Thursday 15:00–15:45
            await AddReservationAsync(organizationId, mike.Id, demoUser.Id, privateType.Id,
                WD(THU, 15), WD(THU, 15).AddMinutes(45), arena.Id, ReservationStatus.Canceled,
                "Client canceled (demo).", now, ct);

            // Booked variety — Soccer & Acupuncture (distinct hours)
            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                WD(WED, 17), WD(WED, 19), outdoor.Id, ReservationStatus.Booked,
                "Kids' soccer clinic.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                WD(FRI, 10), WD(FRI, 12), outdoor.Id, ReservationStatus.Booked,
                "Morning soccer camp, outdoor.", now, ct);

            await AddReservationAsync(organizationId, mike.Id, demoUser.Id, acupunctureType.Id,
                WD(MON, 13), WD(MON, 14), studio2.Id, ReservationStatus.Booked,
                "Initial consult + acupuncture.", now, ct);

            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, acupunctureType.Id,
                WD(TUE, 15), WD(TUE, 16), studio2.Id, ReservationStatus.Booked,
                "Stress relief session.", now, ct);

            // Blocked time this week — Thursday 12:00–15:00
            await AddBlockedTimeAsync(organizationId, arena.Id, "Floor waxing",
                WD(THU, 12), WD(THU, 15), "#cccccc", demoUser.Id, ct);

            // --- CURRENT WEEK: weekend extras (kept minimal, unique content) ---
            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, yogaType.Id,
                WD(SAT, 9), WD(SAT, 10), arena.Id, ReservationStatus.Booked,
                "Weekend yoga — open to all.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                WD(SUN, 13), WD(SUN, 15), outdoor.Id, ReservationStatus.Booked,
                "Sunday family soccer clinic.", now, ct);

            // --- NEXT WEEK: a few items to make "Next Week" navigation interesting ---
            await AddReservationAsync(organizationId, mike.Id, bob.Id, massageType.Id,
                NWD(MON, 11), NWD(MON, 12), studio2.Id, ReservationStatus.Booked,
                "Next week massage demo slot.", now, ct);

            await AddReservationAsync(organizationId, carla.Id, demoUser.Id, soccerType.Id,
                NWD(WED, 17), NWD(WED, 19), outdoor.Id, ReservationStatus.Booked,
                "Next week soccer clinic.", now, ct);

            await AddReservationAsync(organizationId, nina.Id, demoUser.Id, acupunctureType.Id,
                NWD(TUE, 9), NWD(TUE, 10), studio2.Id, ReservationStatus.Booked,
                "Next week acupuncture session.", now, ct);

            // A future blocked slot late next week (Fri evening)
            await AddBlockedTimeAsync(organizationId, arena.Id, "Private booking",
                NWD(FRI, 18), NWD(FRI, 21), "#fcba03", bob.Id, ct);
        }

        /// <summary>Ensures a role exists.</summary>
        private async Task EnsureRoleAsync(string roleName, CancellationToken ct)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        /// <summary>
        /// Returns the local "today" date for the organization's time zone.
        /// </summary>
        private static DateOnly LocalToday(DateTimeOffset nowValue, string tzId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localNow = TimeZoneInfo.ConvertTime(nowValue, tz);
            return DateOnly.FromDateTime(localNow.Date);
        }

        /// <summary>
        /// Returns the start of week for the given date and first day-of-week.
        /// </summary>
        private static DateOnly StartOfWeek(DateOnly date, DayOfWeek firstDow)
        {
            int diff = (7 + (date.DayOfWeek - firstDow)) % 7;
            return date.AddDays(-diff);
        }

        /// <summary>
        /// Builds a local DateTimeOffset at the specified weekday/hour within a Monday-based week.
        /// The <paramref name="weekStartLocal"/> is expected to be a Monday of the target week.
        /// </summary>
        private static DateTimeOffset AtLocalWeek(
            DateTimeOffset nowValue,
            string tzId,
            DateOnly weekStartLocal,
            int dayOffset,
            int hour,
            int minute = 0)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localDateTime = weekStartLocal.AddDays(dayOffset).ToDateTime(new TimeOnly(hour, minute));
            var unspecified = DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified);
            var offset = tz.GetUtcOffset(unspecified);
            return new DateTimeOffset(unspecified, offset);
        }

        /// <summary>
        /// Creates or returns an existing demo member with the specified role in the organization.
        /// </summary>
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

        /// <summary>
        /// Ensures a named resource exists in the organization.
        /// </summary>
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

        /// <summary>
        /// Ensures a named appointment type exists in the organization.
        /// </summary>
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

        /// <summary>
        /// Grants a provider access to a resource.
        /// </summary>
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

        /// <summary>
        /// Grants a provider access to an appointment type.
        /// </summary>
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

        /// <summary>
        /// Associates an appointment type with a resource.
        /// </summary>
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

        /// <summary>
        /// Adds a reservation if an identical one does not already exist.
        /// </summary>
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

        /// <summary>
        /// Adds a blocked time if an identical one does not already exist.
        /// </summary>
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
