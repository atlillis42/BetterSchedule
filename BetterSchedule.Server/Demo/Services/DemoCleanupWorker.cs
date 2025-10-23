using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Options;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BetterSchedule.Server.Services.Demo
{
    /// <summary>
    /// Periodically removes expired demo sandboxes. Uses SQL applock to avoid duplicate runs
    /// across multiple app instances in Azure App Service.
    /// </summary>
    public sealed class DemoCleanupWorker : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<DemoCleanupWorker> _logger;
        private readonly DemoOptions _options;

        public DemoCleanupWorker(IServiceProvider services, ILogger<DemoCleanupWorker> logger, IOptions<DemoOptions> options)
        {
            _services = services;
            _logger = logger;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var delay = TimeSpan.FromMinutes(Math.Max(5, _options.CleanupScanMinutes));

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _services.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    if (await TryAcquireSqlAppLockAsync(db, "DemoSandboxCleanup", stoppingToken))
                    {
                        try
                        {
                            var svc = scope.ServiceProvider.GetRequiredService<ISandboxService>();
                            var removed = await svc.CleanupExpiredSandboxesAsync(stoppingToken);
                            _logger.LogInformation("DemoCleanup: removed {Count} expired demo sandboxes.", removed);
                        }
                        finally
                        {
                            await ReleaseSqlAppLockAsync(db, "DemoSandboxCleanup", stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "DemoCleanup: error during cleanup pass.");
                }

                try { await Task.Delay(delay, stoppingToken); }
                catch (OperationCanceledException) { /* shutting down */ }
            }
        }

        private static async Task<bool> TryAcquireSqlAppLockAsync(ApplicationDbContext db, string resource, CancellationToken ct)
        {
            var conn = (SqlConnection)db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync(ct);

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "sp_getapplock";
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Resource", resource);
            cmd.Parameters.AddWithValue("@LockMode", "Exclusive");
            cmd.Parameters.AddWithValue("@LockOwner", "Session");
            cmd.Parameters.AddWithValue("@LockTimeout", 60000);

            var ret = new SqlParameter { Direction = ParameterDirection.ReturnValue };
            cmd.Parameters.Add(ret);

            await cmd.ExecuteNonQueryAsync(ct);
            var code = (int)(ret.Value ?? -1);
            return code >= 0; // granted
        }

        private static async Task ReleaseSqlAppLockAsync(ApplicationDbContext db, string resource, CancellationToken ct)
        {
            var conn = (SqlConnection)db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync(ct);

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "sp_releaseapplock";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Resource", resource);
            cmd.Parameters.AddWithValue("@LockOwner", "Session");
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }
}
