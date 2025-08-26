using System;
using System.Linq;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Business;   // <-- Package, PackageAssignment, PackageRedemption
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Tests
{
    public static class TestDataSeeder
    {
        public const string OrgId = "test-org";
        public const string OrgName = "Test Org";
        public const string OrgTzId = "America/New_York";

        public static class Users
        {
            public const string M1_Email = "m1@test.local";
            public const string P1_Email = "p1@test.local";
            public const string P2_Email = "p2@test.local";
            public const string C1_Email = "c1@test.local";
            public const string C2_Email = "c2@test.local";
        }

        public static async Task SeedAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            DateTimeOffset fixedUtcNow)
        {
            await EnsureRolesAsync(roleManager, "Manager", "ServiceProvider", "Client");

            var org = await EnsureOrganizationAsync(db, OrgId, OrgName);
            await EnsureOrgSettingsAsync(db, OrgId, OrgTzId);

            var m1 = await EnsureUserAsync(userManager, Users.M1_Email, OrgId, "Manager");
            var p1 = await EnsureUserAsync(userManager, Users.P1_Email, OrgId, "ServiceProvider");
            var p2 = await EnsureUserAsync(userManager, Users.P2_Email, OrgId, "ServiceProvider");
            var c1 = await EnsureUserAsync(userManager, Users.C1_Email, OrgId, "Client");
            var c2 = await EnsureUserAsync(userManager, Users.C2_Email, OrgId, "Client");

            var r1 = await EnsureResourceAsync(db, OrgId, "R1", "#9dd6ff");
            var r2 = await EnsureResourceAsync(db, OrgId, "R2", "#ffd6a5");

            var withRes = await EnsureAppointmentTypeAsync(db, OrgId, "WithResource", 60, 30m, m1.Id, assignedResourceId: r1.Id);
            var noRes = await EnsureAppointmentTypeAsync(db, OrgId, "NoResource", 45, 20m, p1.Id, assignedResourceId: null);

            var todayLocal = LocalToday(fixedUtcNow, OrgTzId);
            var far = new DateOnly(2099, 12, 31);

            // P1 availability: Mon/Wed windows with a midday gap
            foreach (var dow in new[] { DayOfWeek.Monday, DayOfWeek.Wednesday })
            {
                await EnsureAvailabilityAsync(db, OrgId, p1.Id, dow, new TimeSpan(9, 0, 0), new TimeSpan(12, 0, 0), todayLocal, far);
                await EnsureAvailabilityAsync(db, OrgId, p1.Id, dow, new TimeSpan(13, 0, 0), new TimeSpan(17, 0, 0), todayLocal, far);
            }

            // P2 availability: Tue/Thu single window
            foreach (var dow in new[] { DayOfWeek.Tuesday, DayOfWeek.Thursday })
            {
                await EnsureAvailabilityAsync(db, OrgId, p2.Id, dow, new TimeSpan(10, 0, 0), new TimeSpan(15, 0, 0), todayLocal, far);
            }

            // Helpers to create local DateTimeOffset
            DateTimeOffset L(int daysFromToday, int hour, int minute = 0) =>
                AtLocal(fixedUtcNow, OrgTzId, todayLocal, daysFromToday, hour, minute);

            // ------------------------------------------------------------------
            // Reservations (exactly 5)
            // ------------------------------------------------------------------
            // In-progress now (P1, with resource via "WithResource")
            await EnsureReservationAsync(db, OrgId, c1.Id, p1.Id, withRes.Id,
                start: fixedUtcNow.AddMinutes(-15), end: fixedUtcNow.AddMinutes(45),
                resourceId: r1.Id, status: ReservationStatus.Booked, "In-progress", fixedUtcNow);

            // Future (tomorrow 10:00–11:00) (P1) — NoResource (resourceId null)
            await EnsureReservationAsync(db, OrgId, c2.Id, p1.Id, noRes.Id,
                start: L(+1, 10), end: L(+1, 11),
                resourceId: null, status: ReservationStatus.Booked, "Future", fixedUtcNow);

            // Past (yesterday 10:00–11:00) (P1)
            await EnsureReservationAsync(db, OrgId, c1.Id, p1.Id, withRes.Id,
                start: L(-1, 10), end: L(-1, 11),
                resourceId: r1.Id, status: ReservationStatus.Booked, "Past", fixedUtcNow);

            // Canceled (in 2 days 16:00–16:45) (P2)
            await EnsureReservationAsync(db, OrgId, c2.Id, p2.Id, noRes.Id,
                start: L(+2, 16), end: L(+2, 16).AddMinutes(45),
                resourceId: null, status: ReservationStatus.Canceled, "Canceled", fixedUtcNow);

            // No-show (3 days ago 14:00–15:30) (P2)
            await EnsureReservationAsync(db, OrgId, c1.Id, p2.Id, withRes.Id,
                start: L(-3, 14), end: L(-3, 15).AddMinutes(30),
                resourceId: r2.Id, status: ReservationStatus.NoShow, "No-show", fixedUtcNow);

            // ------------------------------------------------------------------
            // Packages & Assignments (for targeted tests)
            // ------------------------------------------------------------------
            // Active, unlocked package for "NoResource" type
            var pkgNoResUnlocked = await EnsurePackageAsync(
                db, OrgId, appointmentTypeId: noRes.Id,
                providerLocked: false, providerId: null, isActive: true);

            // Active, provider-locked package for "WithResource" type, locked to P1
            var pkgWithResLockedP1 = await EnsurePackageAsync(
                db, OrgId, appointmentTypeId: withRes.Id,
                providerLocked: true, providerId: p1.Id, isActive: true);

            // Inactive package (negative test)
            var pkgInactiveNoRes = await EnsurePackageAsync(
                db, OrgId, appointmentTypeId: noRes.Id,
                providerLocked: false, providerId: null, isActive: false);

            // Assignments:
            // - C1 gets 2 remaining uses on the unlocked NoResource package (valid, non-expired)
            await EnsurePackageAssignmentAsync(db, OrgId, pkgNoResUnlocked.Id, c1.Id,
                remainingUses: 2, expiresAtUtc: fixedUtcNow.AddDays(30), isDeleted: false);

            // - C2 gets 1 remaining use on the provider-locked P1 package (valid)
            await EnsurePackageAssignmentAsync(db, OrgId, pkgWithResLockedP1.Id, c2.Id,
                remainingUses: 1, expiresAtUtc: null, isDeleted: false);

            // - C1 gets an EXPIRED assignment (should fail validation)
            await EnsurePackageAssignmentAsync(db, OrgId, pkgNoResUnlocked.Id, c1.Id,
                remainingUses: 5, expiresAtUtc: fixedUtcNow.AddDays(-1), isDeleted: false);

            // - C2 gets an EXHAUSTED assignment (RemainingUses = 0)
            await EnsurePackageAssignmentAsync(db, OrgId, pkgNoResUnlocked.Id, c2.Id,
                remainingUses: 0, expiresAtUtc: fixedUtcNow.AddDays(60), isDeleted: false);

            // - C1 gets an assignment on an INACTIVE package (should be treated as not found)
            await EnsurePackageAssignmentAsync(db, OrgId, pkgInactiveNoRes.Id, c1.Id,
                remainingUses: 3, expiresAtUtc: fixedUtcNow.AddDays(60), isDeleted: false);

            // If you need a pre-redeemed example for some tests, you can link a redemption
            // to one of the reservations above. Keep commented by default to avoid interfering
            // with “exactly 5 reservations” invariants.
            //
            // var anyBooked = await db.Reservations.FirstAsync(r => r.OrganizationId == OrgId && r.Status == ReservationStatus.Booked);
            // var c1NoResAssignment = await db.PackageAssignments.FirstAsync(a => a.OrganizationId == OrgId && a.ClientId == c1.Id && a.PackageId == pkgNoResUnlocked.Id && a.RemainingUses > 0);
            // await EnsurePackageRedemptionAsync(db, OrgId, c1NoResAssignment.Id, anyBooked.Id, uses: 1, createdAt: fixedUtcNow);
        }

        // ---------- helpers ----------

        private static DateOnly LocalToday(DateTimeOffset now, string tzId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var local = TimeZoneInfo.ConvertTime(now, tz);
            return DateOnly.FromDateTime(local.Date);
        }

        private static DateTimeOffset AtLocal(DateTimeOffset now, string tzId, DateOnly baseLocalDay, int dayOffset, int hour, int minute = 0)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            var localDateTime = baseLocalDay.AddDays(dayOffset).ToDateTime(new TimeOnly(hour, minute));
            var unspecified = DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified);
            var offset = tz.GetUtcOffset(unspecified);
            return new DateTimeOffset(unspecified, offset);
        }

        private static async Task EnsureRolesAsync(RoleManager<IdentityRole> roleManager, params string[] roles)
        {
            foreach (var r in roles)
                if (!await roleManager.RoleExistsAsync(r))
                    await roleManager.CreateAsync(new IdentityRole(r));
        }

        private static async Task<Organization> EnsureOrganizationAsync(ApplicationDbContext db, string id, string name)
        {
            var org = await db.Organizations.FirstOrDefaultAsync(x => x.Id == id);
            if (org is null)
            {
                org = new Organization { Id = id, Name = name };
                db.Organizations.Add(org);
                await db.SaveChangesAsync();
            }
            else if (org.Name != name)
            {
                org.Name = name;
                await db.SaveChangesAsync();
            }
            return org;
        }

        private static async Task EnsureOrgSettingsAsync(ApplicationDbContext db, string orgId, string tzId)
        {
            var s = await db.OrganizationSettings.FirstOrDefaultAsync(x => x.OrganizationId == orgId);
            if (s is null)
            {
                s = new OrganizationSettings
                {
                    OrganizationId = orgId,
                    MinLeadMinutes = 60,
                    CancelWindowHours = 24,
                    ShowWeekends = true,
                    StartOfWeek = 0,
                    BusinessHoursStartLocal = new TimeSpan(8, 0, 0),
                    BusinessHoursEndLocal = new TimeSpan(18, 0, 0),
                    DefaultView = DefaultCalendarView.Week,
                    ShadingMode = CalendarShadingMode.ProviderAvailability,
                    AvailabilityEnforcement = AvailabilityEnforcement.BlockProvidersWarnManagers,
                    RequireConfirmOnOverrides = true,
                    AvailabilityPublic = true,
                    ProvidersCanEditOwnAvailability = true,
                    TimeZoneId = tzId,
                    Locale = "en-US",
                    EmailEnabled = false,
                    SmsEnabled = false,
                    SendBookingConfirmation = false,
                    ReminderHoursBefore = null
                };
                db.OrganizationSettings.Add(s);
                await db.SaveChangesAsync();
            }
        }

        private static async Task<ApplicationUser> EnsureUserAsync(UserManager<ApplicationUser> um, string email, string orgId, string role)
        {
            var user = await um.FindByEmailAsync(email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    OrganizationId = orgId
                };
                await um.CreateAsync(user, "Password123!");
                await um.AddToRoleAsync(user, role);
            }
            else
            {
                if (user.OrganizationId != orgId)
                {
                    user.OrganizationId = orgId;
                    await um.UpdateAsync(user);
                }
                if (!await um.IsInRoleAsync(user, role))
                    await um.AddToRoleAsync(user, role);
            }
            return user;
        }

        private static async Task<CalendarResource> EnsureResourceAsync(ApplicationDbContext db, string orgId, string name, string color)
        {
            var r = await db.CalendarResources.FirstOrDefaultAsync(x => x.OrganizationId == orgId && x.Name == name);
            if (r is null)
            {
                r = new CalendarResource { OrganizationId = orgId, Name = name, BackColor = color, IsDeleted = false };
                db.CalendarResources.Add(r);
                await db.SaveChangesAsync();
            }
            return r;
        }

        private static async Task<AppointmentType> EnsureAppointmentTypeAsync(
            ApplicationDbContext db, string orgId, string name, int minutes, decimal price, string createdByUserId, int? assignedResourceId)
        {
            var t = await db.AppointmentTypes.FirstOrDefaultAsync(x => x.OrganizationId == orgId && x.Name == name);
            if (t is null)
            {
                t = new AppointmentType
                {
                    OrganizationId = orgId,
                    Name = name,
                    Duration = TimeSpan.FromMinutes(minutes),
                    Price = price,
                    CreatedByUserId = createdByUserId,
                    AssignedResourceId = assignedResourceId,
                    IsPublic = true,
                    RequiresWaiver = false,
                    IsDeleted = false
                };
                db.AppointmentTypes.Add(t);
                await db.SaveChangesAsync();
            }
            return t;
        }

        private static async Task EnsureAvailabilityAsync(
            ApplicationDbContext db, string orgId, string providerId, DayOfWeek dow,
            TimeSpan start, TimeSpan end, DateOnly effectiveFrom, DateOnly effectiveTo)
        {
            var exists = await db.ProviderAvailabilities.AnyAsync(a =>
                a.OrganizationId == orgId && a.ServiceProviderId == providerId &&
                a.DayOfWeek == dow && a.StartLocalTime == start && a.EndLocalTime == end &&
                a.EffectiveFrom == effectiveFrom && a.EffectiveTo == effectiveTo && !a.IsDeleted);
            if (exists) return;

            db.ProviderAvailabilities.Add(new ProviderAvailability
            {
                OrganizationId = orgId,
                ServiceProviderId = providerId,
                DayOfWeek = dow,
                StartLocalTime = start,
                EndLocalTime = end,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
        }

        private static async Task EnsureReservationAsync(
            ApplicationDbContext db,
            string orgId,
            string clientId,
            string providerId,
            int appointmentTypeId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            ReservationStatus status,
            string? notes,
            DateTimeOffset createdAtUtc)
        {
            var exists = await db.Reservations.AnyAsync(r =>
                r.OrganizationId == orgId &&
                r.ClientId == clientId &&
                r.ServiceProviderId == providerId &&
                r.AppointmentTypeId == appointmentTypeId &&
                r.StartTime == start &&
                r.EndTime == end);
            if (exists) return;

            db.Reservations.Add(new Reservation
            {
                OrganizationId = orgId,
                ClientId = clientId,
                ServiceProviderId = providerId,
                AppointmentTypeId = appointmentTypeId,
                StartTime = start,
                EndTime = end,
                ResourceId = resourceId,
                Status = status,
                Notes = notes,
                CreatedAt = createdAtUtc,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
        }

        // ---------------- Packages helpers ----------------

        private static async Task<Package> EnsurePackageAsync(
            ApplicationDbContext db,
            string orgId,
            int appointmentTypeId,
            bool providerLocked,
            string? providerId,
            bool isActive)
        {
            // Idempotent: treat the (org, type, locked, providerId, isActive) tuple as a seed key
            var pkg = await db.Packages.FirstOrDefaultAsync(x =>
                x.OrganizationId == orgId &&
                x.AppointmentTypeId == appointmentTypeId &&
                x.ProviderLocked == providerLocked &&
                x.ProviderId == providerId &&
                x.IsActive == isActive);

            if (pkg is null)
            {
                pkg = new Package
                {
                    OrganizationId = orgId,
                    AppointmentTypeId = appointmentTypeId,
                    ProviderLocked = providerLocked,
                    ProviderId = providerId,
                    IsActive = isActive
                };
                db.Packages.Add(pkg);
                await db.SaveChangesAsync();
            }
            return pkg;
        }

        private static async Task<PackageAssignment> EnsurePackageAssignmentAsync(
            ApplicationDbContext db,
            string orgId,
            int packageId,
            string clientId,
            int remainingUses,
            DateTimeOffset? expiresAtUtc,
            bool isDeleted)
        {
            // Allow multiple assignments to the same package/client distinguished by expiry date
            var a = await db.PackageAssignments.FirstOrDefaultAsync(x =>
                x.OrganizationId == orgId &&
                x.PackageId == packageId &&
                x.ClientId == clientId &&
                x.ExpiresAtUtc == expiresAtUtc);

            if (a is null)
            {
                a = new PackageAssignment
                {
                    OrganizationId = orgId,
                    PackageId = packageId,
                    ClientId = clientId,
                    RemainingUses = remainingUses,
                    ExpiresAtUtc = expiresAtUtc,
                    IsDeleted = isDeleted
                };
                db.PackageAssignments.Add(a);
                await db.SaveChangesAsync();
            }
            else
            {
                var changed = false;
                if (a.RemainingUses != remainingUses) { a.RemainingUses = remainingUses; changed = true; }
                if (a.IsDeleted != isDeleted) { a.IsDeleted = isDeleted; changed = true; }
                if (changed) await db.SaveChangesAsync();
            }
            return a;
        }

        // Optional pre-redeemed helper (kept unused by default)
        private static async Task EnsurePackageRedemptionAsync(
            ApplicationDbContext db,
            string orgId,
            int assignmentId,
            int reservationId,
            int uses,
            DateTimeOffset createdAt)
        {
            var exists = await db.PackageRedemptions.AnyAsync(x =>
                x.OrganizationId == orgId &&
                x.PackageAssignmentId == assignmentId &&
                x.ReservationId == reservationId);

            if (exists) return;

            db.PackageRedemptions.Add(new PackageRedemption
            {
                OrganizationId = orgId,
                PackageAssignmentId = assignmentId,
                ReservationId = reservationId,
                Uses = uses,
                CreatedAt = createdAt
            });
            await db.SaveChangesAsync();
        }
    }
}
