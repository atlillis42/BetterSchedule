using BetterSchedule.Server.Database;
using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Server.DevTools
{
    // Identity Seeding Utility
    public static class IdentitySeeder
    {
        public static async Task SeedDataAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            string[] roles = ["Manager", "ServiceProvider", "Client"];
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            var devUser = await userManager.FindByEmailAsync("admin@dev.local");
            if (devUser == null)
            {
                devUser = new ApplicationUser
                {
                    UserName = "admin@dev.local",
                    Email = "admin@dev.local",
                    EmailConfirmed = true
                };
                await userManager.CreateAsync(devUser, "Devpass123!");
                foreach (var role in roles)
                {
                    await userManager.AddToRoleAsync(devUser, role);
                }
            }
        }
    }
}
