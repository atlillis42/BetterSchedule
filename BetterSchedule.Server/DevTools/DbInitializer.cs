// BetterSchedule.Server/DevTools/DbInitializer.cs
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.DevTools
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            bool reset = false)
        {
            // -------------------------------
            // Roles
            // -------------------------------
            var roles = new[] { "Manager", "ServiceProvider", "Client" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // -------------------------------
            // Optional reset (domain data only; keep Identity users)
            // Order matters due to Restrict deletes
            // -------------------------------
            if (reset)
            {
                db.ReservationParticipants.RemoveRange(db.ReservationParticipants);
                db.Reservations.RemoveRange(db.Reservations);
                db.BlockedTimes.RemoveRange(db.BlockedTimes);
                db.AppointmentTypes.RemoveRange(db.AppointmentTypes);
                db.CalendarResources.RemoveRange(db.CalendarResources);
                await db.SaveChangesAsync();
            }

            // -------------------------------
            // Organizations (two orgs to test tenant isolation)
            // -------------------------------
            var org1 = await EnsureOrganizationAsync(db, id: "demo-org-1", name: "Demo Organization");
            var org2 = await EnsureOrganizationAsync(db, id: "demo-org-2", name: "Second Demo Org");

            // -------------------------------
            // Dev login users (by email) in org1
            // -------------------------------
            await EnsureDevUserAsync("admin@dev.local", org1.Id, roles: new[] { "Manager", "ServiceProvider", "Client" });
            await EnsureDevUserAsync("provider@dev.local", org1.Id, roles: new[] { "ServiceProvider" });
            await EnsureDevUserAsync("client@dev.local", org1.Id, roles: new[] { "Client" });
            await EnsureDevUserAsync("hybrid@dev.local", org1.Id, roles: new[] { "ServiceProvider", "Client" });

            // -------------------------------
            // Demo users (usernames) per org
            // -------------------------------
            var alice = await EnsureDemoUserAsync(username: "alice", email: "alice@example.com", fullName: "Alice Anderson", role: "Manager", organizationId: org1.Id);
            var bob = await EnsureDemoUserAsync(username: "bob", email: "bob@example.com", fullName: "Bob Brown", role: "ServiceProvider", organizationId: org1.Id);
            var carla = await EnsureDemoUserAsync(username: "carla", email: "carla@example.com", fullName: "Carla Chen", role: "Client", organizationId: org1.Id);

            var dana = await EnsureDemoUserAsync(username: "dana", email: "dana@example.com", fullName: "Dana Diaz", role: "Manager", organizationId: org2.Id);
            var eric = await EnsureDemoUserAsync(username: "eric", email: "eric@example.com", fullName: "Eric Evans", role: "ServiceProvider", organizationId: org2.Id);
            var frank = await EnsureDemoUserAsync(username: "frank", email: "frank@example.com", fullName: "Frank Fox", role: "Client", organizationId: org2.Id);

            // -------------------------------
            // Seed org1 domain data
            // -------------------------------
            var arena = await EnsureResourceAsync(db, org1.Id, "Main Arena", "#ff7373");
            var studio2 = await EnsureResourceAsync(db, org1.Id, "Studio 2", "#73cfff");
            var outdoor = await EnsureResourceAsync(db, org1.Id, "Outdoor Field", "#b5e48c");

            var yogaType = await EnsureAppointmentTypeAsync(db, org1.Id, "Yoga Class", TimeSpan.FromMinutes(60), 18.50m, "Group yoga for all levels.", createdByUserId: alice.Id, assignedLocationId: arena.Id, isPublic: true, requiresWaiver: true);
            var massageType = await EnsureAppointmentTypeAsync(db, org1.Id, "Therapeutic Massage", TimeSpan.FromMinutes(90), 65.00m, "Full-body massage.", createdByUserId: bob.Id, assignedLocationId: studio2.Id, isPublic: true, requiresWaiver: false);
            var soccerType = await EnsureAppointmentTypeAsync(db, org1.Id, "Youth Soccer Clinic", TimeSpan.FromMinutes(120), 25.00m, "Ages 7-13 skills & games.", createdByUserId: carla.Id, assignedLocationId: outdoor.Id, isPublic: true, requiresWaiver: false);
            var privateType = await EnsureAppointmentTypeAsync(db, org1.Id, "Private Training", TimeSpan.FromMinutes(45), 40.00m, "One-on-one coaching.", createdByUserId: alice.Id, assignedLocationId: arena.Id, isPublic: false, requiresWaiver: false);

            await EnsureReservationAsync(db, org1.Id, clientId: bob.Id, providerId: alice.Id, typeId: yogaType.Id,
                start: UtcToday().AddDays(-7).AddHours(9), end: UtcToday().AddDays(-7).AddHours(10),
                locationId: arena.Id.ToString(), status: ReservationStatus.Completed, notes: "Completed past yoga session.");

            await EnsureReservationAsync(db, org1.Id, clientId: carla.Id, providerId: bob.Id, typeId: massageType.Id,
                start: UtcToday().AddDays(-3).AddHours(14), end: UtcToday().AddDays(-3).AddHours(15).AddMinutes(30),
                locationId: studio2.Id.ToString(), status: ReservationStatus.NoShow, notes: "Missed massage, client didn't show.");

            await EnsureReservationAsync(db, org1.Id, clientId: alice.Id, providerId: carla.Id, typeId: soccerType.Id,
                start: UtcToday().AddHours(17), end: UtcToday().AddHours(19),
                locationId: outdoor.Id.ToString(), status: ReservationStatus.Booked, notes: "Alice's kids' soccer clinic.");

            await EnsureReservationAsync(db, org1.Id, clientId: bob.Id, providerId: carla.Id, typeId: soccerType.Id,
                start: UtcToday().AddDays(2).AddHours(10), end: UtcToday().AddDays(2).AddHours(12),
                locationId: outdoor.Id.ToString(), status: ReservationStatus.Booked, notes: "Morning soccer camp, outdoor.");

            await EnsureReservationAsync(db, org1.Id, clientId: alice.Id, providerId: bob.Id, typeId: privateType.Id,
                start: UtcToday().AddDays(10).AddHours(16), end: UtcToday().AddDays(10).AddHours(16).AddMinutes(45),
                locationId: arena.Id.ToString(), status: ReservationStatus.Canceled, notes: "Cancelled by client.");

            await EnsureBlockedTimeAsync(db, org1.Id, arena.Id,
                reason: "Floor waxing", start: UtcToday().AddDays(1).AddHours(12), end: UtcToday().AddDays(1).AddHours(15), backColor: "#cccccc");

            await EnsureBlockedTimeAsync(db, org1.Id, arena.Id,
                reason: "Private booking", start: UtcToday().AddDays(5).AddHours(18), end: UtcToday().AddDays(5).AddHours(21), backColor: "#fcba03");

            // -------------------------------
            // Seed org2 domain data (smaller set, good for cross-org tests)
            // -------------------------------
            var studioA = await EnsureResourceAsync(db, org2.Id, "Studio A", "#a0c4ff");
            var turfField = await EnsureResourceAsync(db, org2.Id, "Turf Field", "#caffbf");

            var pilates = await EnsureAppointmentTypeAsync(db, org2.Id, "Pilates", TimeSpan.FromMinutes(50), 22.00m, "Mat pilates.", createdByUserId: dana.Id, assignedLocationId: studioA.Id, isPublic: true, requiresWaiver: false);

            await EnsureReservationAsync(db, org2.Id, clientId: frank.Id, providerId: eric.Id, typeId: pilates.Id,
                start: UtcToday().AddDays(1).AddHours(9), end: UtcToday().AddDays(1).AddHours(10),
                locationId: studioA.Id.ToString(), status: ReservationStatus.Booked, notes: "Org2 pilates.");

            await EnsureBlockedTimeAsync(db, org2.Id, turfField.Id,
                reason: "Maintenance", start: UtcToday().AddDays(3).AddHours(8), end: UtcToday().AddDays(3).AddHours(12), backColor: "#dddddd");

            // ✅ done
            return;

            // ----------------------------------------------------------------
            // Local helpers (null-safe + idempotent + readable)
            // ----------------------------------------------------------------

            static DateTimeOffset UtcToday() => DateTimeOffset.UtcNow.Date;

            async Task<ApplicationUser> EnsureDevUserAsync(string email, string organizationId, string[] roles)
            {
                // Find by email; create if missing; ensure org + roles
                var user = await userManager.FindByEmailAsync(email);
                if (user is null)
                {
                    user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true,
                        OrganizationId = organizationId
                    };
                    await userManager.CreateAsync(user, "Devpass123!");
                }

                if (user.OrganizationId != organizationId)
                {
                    user.OrganizationId = organizationId;
                    await userManager.UpdateAsync(user);
                }

                foreach (var r in roles)
                {
                    if (!await userManager.IsInRoleAsync(user, r))
                        await userManager.AddToRoleAsync(user, r);
                }

                return user;
            }

            async Task<ApplicationUser> EnsureDemoUserAsync(string username, string email, string fullName, string role, string organizationId)
            {
                // Find by username; create if missing; ensure org + role
                var user = await userManager.FindByNameAsync(username);
                if (user is null)
                {
                    user = new ApplicationUser
                    {
                        UserName = username,
                        Email = email,
                        FullName = fullName,
                        EmailConfirmed = true,
                        OrganizationId = organizationId
                    };
                    await userManager.CreateAsync(user, "Password123!");
                }

                if (user.OrganizationId != organizationId)
                {
                    user.OrganizationId = organizationId;
                    await userManager.UpdateAsync(user);
                }

                if (!await userManager.IsInRoleAsync(user, role))
                    await userManager.AddToRoleAsync(user, role);

                return user;
            }

            static async Task<Organization> EnsureOrganizationAsync(ApplicationDbContext db, string id, string name)
            {
                var org = await db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
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

            static async Task<CalendarResource> EnsureResourceAsync(ApplicationDbContext db, string organizationId, string name, string? backColor)
            {
                var res = await db.CalendarResources.FirstOrDefaultAsync(r => r.OrganizationId == organizationId && r.Name == name);
                if (res is null)
                {
                    res = new CalendarResource { OrganizationId = organizationId, Name = name, BackColor = backColor, IsDeleted = false };
                    db.CalendarResources.Add(res);
                    await db.SaveChangesAsync();
                }
                else
                {
                    // keep it fresh but stable
                    if (res.BackColor != backColor)
                    {
                        res.BackColor = backColor;
                        await db.SaveChangesAsync();
                    }
                }
                return res;
            }

            static async Task<AppointmentType> EnsureAppointmentTypeAsync(
                ApplicationDbContext db,
                string organizationId,
                string name,
                TimeSpan duration,
                decimal price,
                string? description,
                string createdByUserId,
                int? assignedLocationId,
                bool isPublic,
                bool requiresWaiver)
            {
                var type = await db.AppointmentTypes.FirstOrDefaultAsync(a => a.OrganizationId == organizationId && a.Name == name);
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
                        AssignedLocationId = assignedLocationId,
                        IsPublic = isPublic,
                        RequiresWaiver = requiresWaiver,
                        IsDeleted = false
                    };
                    db.AppointmentTypes.Add(type);
                    await db.SaveChangesAsync();
                }
                else
                {
                    // Update key fields if they drift 
                    var changed = false;
                    if (type.Duration != duration) { type.Duration = duration; changed = true; }
                    if (type.Price != price) { type.Price = price; changed = true; }
                    if (type.Description != description) { type.Description = description; changed = true; }
                    if (type.AssignedLocationId != assignedLocationId) { type.AssignedLocationId = assignedLocationId; changed = true; }
                    if (type.IsPublic != isPublic) { type.IsPublic = isPublic; changed = true; }
                    if (type.RequiresWaiver != requiresWaiver) { type.RequiresWaiver = requiresWaiver; changed = true; }
                    if (changed) await db.SaveChangesAsync();
                }
                return type;
            }

            static async Task EnsureReservationAsync(
                ApplicationDbContext db,
                string organizationId,
                string clientId,
                string providerId,
                int typeId,
                DateTimeOffset start,
                DateTimeOffset end,
                string? locationId,
                ReservationStatus status,
                string? notes)
            {
                // Idempotency check: same org + type + client + provider + start/end
                var exists = await db.Reservations.AnyAsync(r =>
                    r.OrganizationId == organizationId &&
                    r.ClientId == clientId &&
                    r.ServiceProviderId == providerId &&
                    r.AppointmentTypeId == typeId &&
                    r.StartTime == start &&
                    r.EndTime == end);

                if (exists) return;

                db.Reservations.Add(new Reservation
                {
                    OrganizationId = organizationId,
                    ClientId = clientId,
                    ServiceProviderId = providerId,
                    AppointmentTypeId = typeId,
                    StartTime = start,
                    EndTime = end,
                    LocationId = locationId,
                    Status = status,
                    Notes = notes,
                    CreatedAt = DateTimeOffset.UtcNow,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }

            static async Task EnsureBlockedTimeAsync(
                ApplicationDbContext db,
                string organizationId,
                int resourceId,
                string reason,
                DateTimeOffset start,
                DateTimeOffset end,
                string? backColor)
            {
                // Idempotency: same org + resource + reason + window
                var exists = await db.BlockedTimes.AnyAsync(b =>
                    b.OrganizationId == organizationId &&
                    b.ResourceId == resourceId &&
                    b.Reason == reason &&
                    b.StartTime == start &&
                    b.EndTime == end);

                if (exists) return;

                db.BlockedTimes.Add(new BlockedTime
                {
                    OrganizationId = organizationId,
                    ResourceId = resourceId,
                    Reason = reason,
                    StartTime = start,
                    EndTime = end,
                    BackColor = backColor,
                    IsDeleted = false
                });
                await db.SaveChangesAsync();
            }
        }
    }
}
