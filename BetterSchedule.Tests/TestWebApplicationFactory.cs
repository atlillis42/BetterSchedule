using System.Linq;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Time;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Tests
{
    public class TestWebApplicationFactory : WebApplicationFactory<BetterSchedule.Server.Program>
    {
        // Choose any fixed instant—you can move this if tests need different “now”
        private static readonly DateTimeOffset FixedNow = new DateTimeOffset(2025, 01, 15, 12, 00, 00, TimeSpan.Zero);

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            builder.ConfigureServices(services =>
            {
                // Replace DbContext with InMemory
                var dbDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (dbDescriptor is not null) services.Remove(dbDescriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("BetterSchedule_TestDb");
                });

                // Replace IDateTimeProvider with fixed provider
                var clockDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IDateTimeProvider));
                if (clockDescriptor is not null) services.Remove(clockDescriptor);
                services.AddSingleton<IDateTimeProvider>(_ => new FixedDateTimeProvider(FixedNow));

                // Build and seed
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var scoped = scope.ServiceProvider;

                var db = scoped.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureDeleted();
                db.Database.EnsureCreated();

                var userManager = scoped.GetRequiredService<UserManager<ApplicationUser>>();
                var roleManager = scoped.GetRequiredService<RoleManager<IdentityRole>>();

                // Seed the compact Phase-0 dataset
                TestDataSeeder.SeedAsync(db, userManager, roleManager, FixedNow).GetAwaiter().GetResult();
            });
        }
    }
}
