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

            if (context.Database.IsRelational())
            {
                context.Database.Migrate();
            }
            else
            {
                context.Database.EnsureCreated();
            }
        }       
    }
}
    

    

