using System.Linq;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Server.DevTools.Seeding
{
    public static class SeedRunner
    {
        public static async Task ExecuteAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            SeedOptions options)
        {
            if (options is null || !options.Enabled) return;

            foreach (var role in new[] { "Manager", "ServiceProvider", "Client" })
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));

            if (options.Reset)
            {
                db.ReservationParticipants.RemoveRange(db.ReservationParticipants);
                db.Reservations.RemoveRange(db.Reservations);
                db.BlockedTimes.RemoveRange(db.BlockedTimes);
                db.ProviderAvailabilities.RemoveRange(db.ProviderAvailabilities);
                db.AppointmentTypes.RemoveRange(db.AppointmentTypes);
                db.CalendarResources.RemoveRange(db.CalendarResources);
                db.OrganizationSettings.RemoveRange(db.OrganizationSettings);
                db.Organizations.RemoveRange(db.Organizations);
                await db.SaveChangesAsync();
            }

            await BaseSeed.ApplyAsync(db, userManager, options);

            if (options.Scenarios?.Length > 0)
            {
                foreach (var s in options.Scenarios.Where(x => !string.IsNullOrWhiteSpace(x)))
                {
                    //if (s == "DoubleBookingConflict")
                    //    await ScenarioPacks.DoubleBookingConflict.ApplyAsync(db);
                }
            }
        }
    }
}
