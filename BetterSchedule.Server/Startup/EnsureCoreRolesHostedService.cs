using Microsoft.AspNetCore.Identity;

namespace BetterSchedule.Server.Startup
{
    public sealed class EnsureCoreRolesHostedService : IHostedService
    {
        private readonly IServiceProvider _sp;
        private static readonly string[] Roles = new[] { "Manager", "ServiceProvider", "Client" };

        public EnsureCoreRolesHostedService(IServiceProvider sp) => _sp = sp;

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            using var scope = _sp.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            foreach (var role in Roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
