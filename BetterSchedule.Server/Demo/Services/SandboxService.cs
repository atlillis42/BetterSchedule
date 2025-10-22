using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BetterSchedule.Server.Services.Demo
{
    /// <summary>
    /// Orchestrates creation of per-visitor sandbox Organizations, mints an ephemeral cookie-auth user,
    /// assigns required roles, and seeds a standard demo dataset. Includes reset and cleanup operations.
    /// </summary>
    public sealed class SandboxService : ISandboxService
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly DemoOptions _options;
        private readonly IDemoSandboxSeeder _seeder;

        public SandboxService(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IOptions<DemoOptions> options,
            IDemoSandboxSeeder seeder)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
            _options = options.Value;
            _seeder = seeder;
        }

        /// <summary>
        /// Creates a brand-new Organization (guaranteed unique), a unique ephemeral Identity user,
        /// assigns baseline roles, and seeds the demo dataset.
        /// </summary>
        public async Task<SandboxStartResult> StartAnonymousSandboxAsync(CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;
            var ttl = TimeSpan.FromHours(_options.DefaultTtlHours);

            // 1) Create a unique org and commit so other contexts can see it
            var org = await CreateUniqueOrganizationAsync(now, ttl, ct);

            ApplicationUser? ephemeral = null;
            var orgCreated = true;

            try
            {
                // 2) Create a unique ephemeral user (retry on duplicate username/email)
                ephemeral = await CreateUniqueEphemeralUserAsync(org.Id, now.Add(ttl), ct);

                // 3) Ensure roles and assign
                await EnsureRoleAsync("Manager");
                await EnsureRoleAsync("ServiceProvider");

                var addMgr = await _userManager.AddToRoleAsync(ephemeral, "Manager");
                var addSp = await _userManager.AddToRoleAsync(ephemeral, "ServiceProvider");
                if (!addMgr.Succeeded || !addSp.Succeeded)
                {
                    var reason = string.Join("; ",
                        (addMgr.Errors ?? Enumerable.Empty<IdentityError>())
                        .Concat(addSp.Errors ?? Enumerable.Empty<IdentityError>())
                        .Select(e => $"{e.Code}:{e.Description}"));
                    throw new InvalidOperationException($"Failed to assign roles to ephemeral user: {reason}");
                }

                // 4) Seed org data (seeder also ensures client membership for the seed user)
                await _seeder.SeedForSandboxOrgAsync(org.Id, ephemeral.Id, now, ct);

                return new SandboxStartResult
                {
                    OrganizationId = org.Id,
                    EphemeralUserId = ephemeral.Id,
                    EphemeralUserEmail = ephemeral.Email!,
                    IsNewOrg = true
                };
            }
            catch
            {
                // Best-effort cleanup; original exception will bubble up.
                try
                {
                    if (ephemeral != null)
                    {
                        var u = await _userManager.FindByIdAsync(ephemeral.Id);
                        if (u != null) await _userManager.DeleteAsync(u);
                    }

                    if (orgCreated)
                    {
                        await DeleteOrgGraphAsync(org.Id, ct);
                        _db.Organizations.Remove(new Organization { Id = org.Id });
                        await _db.SaveChangesAsync(ct);
                    }
                }
                catch
                {
                    // Intentionally swallow cleanup failures.
                }

                throw;
            }
        }

        /// <summary>
        /// Resets an existing sandbox organization by deleting its child graph and re-seeding.
        /// Optionally preserves the caller's user account within the org by passing it as the seed user.
        /// </summary>
        public async Task<Organization> ResetSandboxAsync(string sandboxOrganizationId, string? excludeUserId, CancellationToken ct)
        {
            var sandbox = await _db.Organizations
                .FirstOrDefaultAsync(o => o.Id == sandboxOrganizationId && o.IsDemo, ct)
                ?? throw new InvalidOperationException("Sandbox organization not found or not marked as demo.");

            var now = DateTimeOffset.UtcNow;
            var ttl = TimeSpan.FromHours(_options.DefaultTtlHours);

            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                await DeleteOrgGraphAsync(sandboxOrganizationId, ct);

                // Refresh TTL
                sandbox.DemoCreatedAtUtc = now;
                sandbox.DemoExpiresAtUtc = now.Add(ttl);
                await _db.SaveChangesAsync(ct);

                await tx.CommitAsync(ct);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }

            // Delete demo users outside of DB transaction
            var demoUserIds = await _db.Users
                .Where(u => u.OrganizationId == sandboxOrganizationId && u.IsDemoEphemeral)
                .Select(u => u.Id)
                .ToListAsync(ct);

            foreach (var uid in demoUserIds)
            {
                if (!string.Equals(uid, excludeUserId, StringComparison.Ordinal))
                {
                    var u = await _userManager.FindByIdAsync(uid);
                    if (u != null) await _userManager.DeleteAsync(u);
                }
            }

            // Recreate or reuse a user for seeding; Seeder will ensure roles and membership.
            string seedUserId;
            if (string.IsNullOrEmpty(excludeUserId))
            {
                var ephemeral = await CreateUniqueEphemeralUserAsync(sandbox.Id, now.Add(ttl), ct);
                await EnsureRoleAsync("Manager");
                await EnsureRoleAsync("ServiceProvider");
                await _userManager.AddToRoleAsync(ephemeral, "Manager");
                await _userManager.AddToRoleAsync(ephemeral, "ServiceProvider");
                seedUserId = ephemeral.Id;
            }
            else
            {
                seedUserId = excludeUserId!;
            }

            await _seeder.SeedForSandboxOrgAsync(sandbox.Id, seedUserId, now, ct);

            // No additional membership insert here — seeder handles it idempotently.

            return sandbox;
        }

        /// <summary>
        /// Deletes all expired demo organizations and their ephemeral users.
        /// </summary>
        public async Task<int> CleanupExpiredSandboxesAsync(CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;
            var expired = await _db.Organizations
                .Where(o => o.IsDemo && o.DemoExpiresAtUtc != null && o.DemoExpiresAtUtc < now)
                .Select(o => o.Id)
                .ToListAsync(ct);

            var removed = 0;
            foreach (var orgId in expired)
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                try
                {
                    await DeleteOrgGraphAsync(orgId, ct);

                    var users = await _db.Users
                        .Where(u => u.OrganizationId == orgId && u.IsDemoEphemeral)
                        .ToListAsync(ct);
                    await tx.CommitAsync(ct);

                    foreach (var u in users)
                    {
                        await _userManager.DeleteAsync(u);
                    }

                    _db.Organizations.Remove(new Organization { Id = orgId });
                    await _db.SaveChangesAsync(ct);

                    removed++;
                }
                catch
                {
                    await tx.RollbackAsync(ct);
                }
            }

            return removed;
        }

        /// <summary>
        /// Creates and persists a unique Organization. Retries on primary key or unique-constraint collisions.
        /// </summary>
        private async Task<Organization> CreateUniqueOrganizationAsync(DateTimeOffset now, TimeSpan ttl, CancellationToken ct)
        {
            const int maxAttempts = 5;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var id = Guid.NewGuid().ToString("n");
                var suffix = id[..4].ToUpperInvariant();

                var org = new Organization
                {
                    Id = id,
                    Name = $"Demo Sandbox {now:yyyyMMdd-HHmmss}-{suffix}",
                    IsDemo = true,
                    DemoCreatedAtUtc = now,
                    DemoExpiresAtUtc = now.Add(ttl),
                    DemoTemplateSourceOrganizationId = null
                };

                try
                {
                    _db.Organizations.Add(org);
                    await _db.SaveChangesAsync(ct);
                    return org;
                }
                catch (DbUpdateException)
                {
                    _db.Entry(org).State = EntityState.Detached;

                    if (attempt == maxAttempts)
                        throw new InvalidOperationException("Failed to allocate a unique Organization.Id after multiple attempts.");
                }
            }

            throw new InvalidOperationException("Unreachable: organization uniqueness loop exhausted unexpectedly.");
        }

        private async Task DeleteOrgGraphAsync(string orgId, CancellationToken ct)
        {
            await _db.PackageRedemptions.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.PackageAssignments.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.Packages.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);

            await _db.ReservationParticipants.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.Reservations.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.BlockedTimes.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);

            await _db.ProviderAvailabilities.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);

            await _db.AppointmentTypeResourceAccesses.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.ProviderAppointmentTypeAccesses.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.ProviderResourceAccesses.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);

            await _db.AppointmentTypes.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.CalendarResources.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);

            await _db.ClientOrganizations.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
            await _db.OrganizationSettings.Where(x => x.OrganizationId == orgId).ExecuteDeleteAsync(ct);
        }

        private async Task EnsureRoleAsync(string roleName)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        private static string NewStrongPassword()
        {
            const string prefix = "Aa1!";
            var bytes = RandomNumberGenerator.GetBytes(16);
            var tail = Convert.ToBase64String(bytes)
                .Replace('+', 'X')
                .Replace('/', 'Y')
                .TrimEnd('=');
            return prefix + tail;
        }

        /// <summary>
        /// Creates a unique ephemeral Identity user under the specified organization.
        /// Retries on DuplicateUserName / DuplicateEmail errors.
        /// </summary>
        private async Task<ApplicationUser> CreateUniqueEphemeralUserAsync(
            string organizationId,
            DateTimeOffset? expiresAtUtc,
            CancellationToken ct)
        {
            const int maxAttempts = 5;
            var password = NewStrongPassword();

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var email = $"demo+{Guid.NewGuid():N}@example.local";
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    OrganizationId = organizationId,
                    IsDemoEphemeral = true,
                    DemoExpiresAtUtc = expiresAtUtc,
                    FullName = "Demo User",
                    IsDeleted = false
                };

                var res = await _userManager.CreateAsync(user, password);
                if (res.Succeeded)
                {
                    return user;
                }

                var codes = res.Errors.Select(e => e.Code).ToArray();
                var duplicateLike = codes.Any(c =>
                    string.Equals(c, "DuplicateUserName", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(c, "DuplicateEmail", StringComparison.OrdinalIgnoreCase) ||
                    c.Contains("Duplicate", StringComparison.OrdinalIgnoreCase));

                if (!duplicateLike || attempt == maxAttempts)
                {
                    var reason = string.Join("; ", res.Errors.Select(e => $"{e.Code}:{e.Description}"));
                    throw new InvalidOperationException($"Failed to create ephemeral user: {reason}");
                }
                // else: loop to try a new email
            }

            throw new InvalidOperationException("Unreachable: user uniqueness loop exhausted unexpectedly.");
        }
    }
}
