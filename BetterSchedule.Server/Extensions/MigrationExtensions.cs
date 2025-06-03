using BetterSchedule.Server.Database;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;

namespace BetterSchedule.Server.Extensions
{
    public static class MigrationExtensions
    {
        public static void ApplyMigrations(this IApplicationBuilder app)
        {
            using IServiceScope scope = app.ApplicationServices.CreateScope();

            using ApplicationDbContext context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            context.Database.Migrate();
        }
        //public static void ApplyMigrations(this IApplicationBuilder app)
        //{
        //    using IServiceScope scope = app.ApplicationServices.CreateScope();
        //    var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
        //    var logger = loggerFactory.CreateLogger("MigrationExtensions");

        //    try
        //    {
        //        using ApplicationDbContext context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        //        context.Database.Migrate();
        //        logger.LogInformation("Database migrations applied successfully.");
        //    }
        //    catch (Exception ex)
        //    {
        //        logger.LogError(ex, "An error occurred while applying database migrations.");
        //        throw; // Optionally rethrow to stop startup
        //    }
        //}
    }
}
    

    

