using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.DevTools
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            bool reset = false)
        {
            // Seed roles
            var roles = new[] { "Manager", "ServiceProvider", "Client" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // Seed Organization
            var orgId = "demo-org-1";
            var org = context.Organizations.FirstOrDefault(o => o.Id == orgId);
            if (org == null)
            {
                org = new Organization { Id = orgId, Name = "Demo Organization" };
                context.Organizations.Add(org);
                await context.SaveChangesAsync();
            }

            // Seed Dev Login Users 
            async Task<ApplicationUser> EnsureDevUserAsync(string email, string[] devRoles)
            {
                var user = await userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true,
                        OrganizationId = orgId
                    };
                    await userManager.CreateAsync(user, "Devpass123!");
                    foreach (var role in devRoles)
                        await userManager.AddToRoleAsync(user, role);
                }
                else if (user.OrganizationId != orgId)
                {
                    user.OrganizationId = orgId;
                    await userManager.UpdateAsync(user);
                }
                return user;
            }

            await EnsureDevUserAsync("admin@dev.local", new[] { "Manager", "ServiceProvider", "Client" });
            await EnsureDevUserAsync("provider@dev.local", new[] { "ServiceProvider" });
            await EnsureDevUserAsync("client@dev.local", new[] { "Client" });
            await EnsureDevUserAsync("hybrid@dev.local", new[] { "ServiceProvider", "Client" });

            // Seed Demo Users 
            async Task<ApplicationUser> EnsureDemoUserAsync(string username, string email, string fullName, string role)
            {
                var user = await userManager.FindByNameAsync(username);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = username,
                        Email = email,
                        FullName = fullName,
                        EmailConfirmed = true,
                        OrganizationId = orgId
                    };
                    await userManager.CreateAsync(user, "Password123!");
                    await userManager.AddToRoleAsync(user, role);
                }
                else if (user.OrganizationId != orgId)
                {
                    user.OrganizationId = orgId;
                    await userManager.UpdateAsync(user);
                }
                return user;
            }

            var alice = await EnsureDemoUserAsync("alice", "alice@example.com", "Alice Anderson", "Manager");
            var bob = await EnsureDemoUserAsync("bob", "bob@example.com", "Bob Brown", "ServiceProvider");
            var carla = await EnsureDemoUserAsync("carla", "carla@example.com", "Carla Chen", "Client");

            // Optional, reset business data
            if (reset)
            {
                context.Reservations.RemoveRange(context.Reservations);
                context.AppointmentTypes.RemoveRange(context.AppointmentTypes);
                context.BlockedTimes.RemoveRange(context.BlockedTimes);
                context.CalendarResources.RemoveRange(context.CalendarResources);
                await context.SaveChangesAsync();
            }

            // Calendar Resources
            if (!context.CalendarResources.Any())
            {
                var arena = new CalendarResource { Name = "Main Arena", BackColor = "#ff7373", OrganizationId = orgId };
                var studio2 = new CalendarResource { Name = "Studio 2", BackColor = "#73cfff", OrganizationId = orgId };
                var outdoor = new CalendarResource { Name = "Outdoor Field", BackColor = "#b5e48c", OrganizationId = orgId };
                context.CalendarResources.AddRange(arena, studio2, outdoor);
                await context.SaveChangesAsync();
            }

            // Appointment Types
            if (!context.AppointmentTypes.Any())
            {
                var arenaId = context.CalendarResources.First(r => r.Name == "Main Arena").Id;
                var studio2Id = context.CalendarResources.First(r => r.Name == "Studio 2").Id;
                var outdoorId = context.CalendarResources.First(r => r.Name == "Outdoor Field").Id;

                var types = new[]
                {
                    new AppointmentType
                    {
                        Name = "Yoga Class",
                        Duration = TimeSpan.FromMinutes(60),
                        Price = 18.50m,
                        Description = "Group yoga for all levels.",
                        CreatedByUserId = alice.Id,
                        AssignedLocationId = arenaId, // int
                        IsPublic = true,
                        RequiresWaiver = true,
                        OrganizationId = orgId
                    },
                    new AppointmentType
                    {
                        Name = "Therapeutic Massage",
                        Duration = TimeSpan.FromMinutes(90),
                        Price = 65.00m,
                        Description = "Full-body massage with licensed therapist.",
                        CreatedByUserId = bob.Id,
                        AssignedLocationId = studio2Id, // int
                        IsPublic = true,
                        OrganizationId = orgId
                    },
                    new AppointmentType
                    {
                        Name = "Youth Soccer Clinic",
                        Duration = TimeSpan.FromMinutes(120),
                        Price = 25.00m,
                        Description = "For ages 7-13, basic skills and games.",
                        CreatedByUserId = carla.Id,
                        AssignedLocationId = outdoorId, // int
                        IsPublic = true,
                        OrganizationId = orgId
                    },
                    new AppointmentType
                    {
                        Name = "Private Training Session",
                        Duration = TimeSpan.FromMinutes(45),
                        Price = 40.00m,
                        Description = "One-on-one coaching.",
                        CreatedByUserId = alice.Id,
                        AssignedLocationId = arenaId, // int
                        IsPublic = false,
                        RequiresWaiver = false,
                        OrganizationId = orgId
                    }
                };
                context.AppointmentTypes.AddRange(types);
                await context.SaveChangesAsync();
            }

            // Reservations
            if (!context.Reservations.Any())
            {
                var yogaType = context.AppointmentTypes.FirstOrDefault(t => t.Name == "Yoga Class");
                var massageType = context.AppointmentTypes.FirstOrDefault(t => t.Name == "Therapeutic Massage");
                var soccerType = context.AppointmentTypes.FirstOrDefault(t => t.Name == "Youth Soccer Clinic");
                var privateType = context.AppointmentTypes.FirstOrDefault(t => t.Name == "Private Training Session");

                var arena = context.CalendarResources.First(r => r.Name == "Main Arena");
                var studio2 = context.CalendarResources.First(r => r.Name == "Studio 2");
                var outdoor = context.CalendarResources.First(r => r.Name == "Outdoor Field");

                context.Reservations.AddRange(
                    new Reservation
                    {
                        ClientId = bob.Id,
                        ServiceProviderId = alice.Id,
                        AppointmentTypeId = yogaType.Id,
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(-7).AddHours(9),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(-7).AddHours(10),
                        LocationId = arena.Id.ToString(), // string, but holds resource int as string
                        Status = ReservationStatus.Completed,
                        Notes = "Completed past yoga session.",
                        CreatedAt = DateTimeOffset.UtcNow.AddDays(-8),
                        OrganizationId = orgId
                    },
                    new Reservation
                    {
                        ClientId = carla.Id,
                        ServiceProviderId = bob.Id,
                        AppointmentTypeId = massageType.Id,
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(-3).AddHours(14),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(-3).AddHours(15).AddMinutes(30),
                        LocationId = studio2.Id.ToString(),
                        Status = ReservationStatus.NoShow,
                        Notes = "Missed massage, client didn't show.",
                        CreatedAt = DateTimeOffset.UtcNow.AddDays(-4),
                        OrganizationId = orgId
                    },
                    new Reservation
                    {
                        ClientId = alice.Id,
                        ServiceProviderId = carla.Id,
                        AppointmentTypeId = soccerType.Id,
                        StartTime = DateTimeOffset.UtcNow.Date.AddHours(17),
                        EndTime = DateTimeOffset.UtcNow.Date.AddHours(19),
                        LocationId = outdoor.Id.ToString(),
                        Status = ReservationStatus.Booked,
                        Notes = "Alice's kids' soccer clinic.",
                        CreatedAt = DateTimeOffset.UtcNow,
                        OrganizationId = orgId
                    },
                    new Reservation
                    {
                        ClientId = bob.Id,
                        ServiceProviderId = carla.Id,
                        AppointmentTypeId = soccerType.Id,
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(2).AddHours(10),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(2).AddHours(12),
                        LocationId = outdoor.Id.ToString(),
                        Status = ReservationStatus.Booked,
                        Notes = "Morning soccer camp, outdoor.",
                        CreatedAt = DateTimeOffset.UtcNow,
                        OrganizationId = orgId
                    },
                    new Reservation
                    {
                        ClientId = alice.Id,
                        ServiceProviderId = bob.Id,
                        AppointmentTypeId = privateType.Id,
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(10).AddHours(16),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(10).AddHours(16).AddMinutes(45),
                        LocationId = arena.Id.ToString(),
                        Status = ReservationStatus.Canceled,
                        Notes = "Cancelled by client.",
                        CreatedAt = DateTimeOffset.UtcNow,
                        OrganizationId = orgId
                    }
                );

                await context.SaveChangesAsync();
            }

            // BlockedTimes 
            if (!context.BlockedTimes.Any())
            {
                var arena = context.CalendarResources.First(r => r.Name == "Main Arena");

                context.BlockedTimes.AddRange(
                    new BlockedTime
                    {
                        Reason = "Floor waxing",
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(1).AddHours(12),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(1).AddHours(15),
                        ResourceId = arena.Id,
                        BackColor = "#cccccc",
                        OrganizationId = orgId
                    },
                    new BlockedTime
                    {
                        Reason = "Private booking",
                        StartTime = DateTimeOffset.UtcNow.Date.AddDays(5).AddHours(18),
                        EndTime = DateTimeOffset.UtcNow.Date.AddDays(5).AddHours(21),
                        ResourceId = arena.Id,
                        BackColor = "#fcba03",
                        OrganizationId = orgId
                    }
                );
                await context.SaveChangesAsync();
            }
        }
    }
}
