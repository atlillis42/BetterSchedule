using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Identity;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Data;

/// <summary>
/// Seeds demo records so the front‑end has something to render on first run.
/// Call <c>await DbInitializer.SeedAsync(context);</c> from Program.cs right after migrations.
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(
    ApplicationDbContext context,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager,
    bool reset = false)
    {
        // Roles
        var roles = new[] { "Manager", "ServiceProvider", "Client" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Users (with passwords for demo purposes)
        async Task<ApplicationUser> CreateUserAsync(string username, string email, string fullname, string role)
        {
            var user = await userManager.FindByNameAsync(username);
            if (user == null)
            {
                user = new ApplicationUser { UserName = username, Email = email, FullName = fullname, EmailConfirmed = true };
                await userManager.CreateAsync(user, "Password123!"); // Use strong password in prod!
                await userManager.AddToRoleAsync(user, role);
            }
            return user;
        }

        var alice = await CreateUserAsync("alice", "alice@example.com", "Alice Anderson", "Manager");
        var bob = await CreateUserAsync("bob", "bob@example.com", "Bob Brown", "ServiceProvider");
        var carla = await CreateUserAsync("carla", "carla@example.com", "Carla Chen", "Client");

        // Optionally, reset related data
        if (reset)
        {
            context.Reservations.RemoveRange(context.Reservations);
            context.AppointmentTypes.RemoveRange(context.AppointmentTypes);
            context.CalendarResources.RemoveRange(context.CalendarResources);
            await context.SaveChangesAsync();
        }

        if (context.AppointmentTypes.Any() || context.Reservations.Any())
            return;

        // Resources
        var arena = new CalendarResource { Name = "Main Arena", BackColor = "#ff7373" };
        var studio2 = new CalendarResource { Name = "Studio 2", BackColor = "#73cfff" };
        var outdoor = new CalendarResource { Name = "Outdoor Field", BackColor = "#b5e48c" };
        context.CalendarResources.AddRange(arena, studio2, outdoor);
        await context.SaveChangesAsync();

        // Appointment Types (linked to users/roles)
        var yogaType = new AppointmentType
        {
            Name = "Yoga Class",
            Duration = TimeSpan.FromMinutes(60),
            Price = 18.50m,
            Description = "Group yoga for all levels.",
            CreatedByUserId = alice.Id,
            AssignedLocationId = arena.Id.ToString(),
            IsPublic = true,
            RequiresWaiver = true
        };
        var massageType = new AppointmentType
        {
            Name = "Therapeutic Massage",
            Duration = TimeSpan.FromMinutes(90),
            Price = 65.00m,
            Description = "Full-body massage with licensed therapist.",
            CreatedByUserId = bob.Id,
            AssignedLocationId = studio2.Id.ToString(),
            IsPublic = true
        };
        var soccerType = new AppointmentType
        {
            Name = "Youth Soccer Clinic",
            Duration = TimeSpan.FromMinutes(120),
            Price = 25.00m,
            Description = "For ages 7-13, basic skills and games.",
            CreatedByUserId = carla.Id, // can be any user, for demo
            AssignedLocationId = outdoor.Id.ToString(),
            IsPublic = true
        };
        var privateType = new AppointmentType
        {
            Name = "Private Training Session",
            Duration = TimeSpan.FromMinutes(45),
            Price = 40.00m,
            Description = "One-on-one coaching.",
            CreatedByUserId = alice.Id,
            AssignedLocationId = arena.Id.ToString(),
            IsPublic = false,
            RequiresWaiver = false
        };
        context.AppointmentTypes.AddRange(yogaType, massageType, soccerType, privateType);
        await context.SaveChangesAsync();

        // Reservations (link to user IDs from Identity)
        context.Reservations.AddRange(
            new Reservation
            {
                ClientId = bob.Id,
                ServiceProviderId = alice.Id,
                AppointmentTypeId = yogaType.Id,
                StartTime = DateTimeOffset.UtcNow.Date.AddDays(-7).AddHours(9),
                EndTime = DateTimeOffset.UtcNow.Date.AddDays(-7).AddHours(10),
                LocationId = arena.Id.ToString(),
                Status = ReservationStatus.Completed,
                Notes = "Completed past yoga session.",
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-8)
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
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-4)
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
                CreatedAt = DateTimeOffset.UtcNow
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
                CreatedAt = DateTimeOffset.UtcNow
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
                CreatedAt = DateTimeOffset.UtcNow
            }
        );

        await context.SaveChangesAsync();
    }

}
