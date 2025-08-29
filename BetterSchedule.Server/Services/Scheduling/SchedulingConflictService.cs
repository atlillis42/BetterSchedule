using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Services.Scheduling
{
    /// <summary>
    /// Centralized availability/conflict checks used by Reservations and BlockedTimes.
    /// Overlap predicate: <c>(start1 &lt; end2 &amp;&amp; end1 &gt; start2)</c>.
    /// Queries are org-scoped and exclude soft-deleted rows. Update variants exclude the
    /// current row by id to avoid self-overlap. Also validates that reservations lie
    /// within ProviderAvailability windows (weekly rules in org-local time).
    /// </summary>
    public sealed class SchedulingConflictService : ISchedulingConflictService
    {
        private readonly ApplicationDbContext _db;

        public SchedulingConflictService(ApplicationDbContext db) => _db = db;

        // --------------------------------------------------------------------
        // Public API (thin wrappers)
        // --------------------------------------------------------------------

        /// <inheritdoc />
        public Task<ReservationConflictResult> CheckReservationCreateAsync(
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken)
            => ComputeReservationConflictsAsync(
                organizationId,
                serviceProviderId,
                resourceId,
                start,
                end,
                ignoreReservationId: null,
                cancellationToken);

        /// <inheritdoc />
        public Task<ReservationConflictResult> CheckReservationUpdateAsync(
            int reservationId,
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken)
            => ComputeReservationConflictsAsync(
                organizationId,
                serviceProviderId,
                resourceId,
                start,
                end,
                ignoreReservationId: reservationId,
                cancellationToken);

        /// <inheritdoc />
        public Task<BlockedTimeConflictResult> CheckBlockedTimeCreateAsync(
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken)
            => ComputeBlockedTimeConflictsAsync(
                organizationId,
                createdByUserId,
                resourceId,
                start,
                end,
                ignoreBlockedTimeId: null,
                cancellationToken);

        /// <inheritdoc />
        public Task<BlockedTimeConflictResult> CheckBlockedTimeUpdateAsync(
            int blockedTimeId,
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken)
            => ComputeBlockedTimeConflictsAsync(
                organizationId,
                createdByUserId,
                resourceId,
                start,
                end,
                ignoreBlockedTimeId: blockedTimeId,
                cancellationToken);

        // --------------------------------------------------------------------
        // Single-source overlap logic
        // --------------------------------------------------------------------

        /// <summary>
        /// Calculates reservation conflicts for a given provider and optional resource,
        /// and verifies the window is fully within ProviderAvailability (local org time).
        /// </summary>
        private async Task<ReservationConflictResult> ComputeReservationConflictsAsync(
            string organizationId,
            string serviceProviderId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? ignoreReservationId,
            CancellationToken ct)
        {
            // Provider-level overlaps (exclude self on update).
            var providerReservations = _db.Reservations
                .Where(r => r.OrganizationId == organizationId && !r.IsDeleted)
                .Where(r => r.ServiceProviderId == serviceProviderId);

            if (ignoreReservationId is not null)
                providerReservations = providerReservations.Where(r => r.Id != ignoreReservationId.Value);

            var providerOverlap = await providerReservations
                .Where(r => r.StartTime < end && r.EndTime > start)
                .AnyAsync(ct);

            // Resource-level reservation overlaps (if a resource is involved).
            var resourceOverlap = false;
            if (resourceId is not null)
            {
                var resourceReservations = _db.Reservations
                    .Where(r => r.OrganizationId == organizationId && !r.IsDeleted)
                    .Where(r => r.ResourceId != null && r.ResourceId == resourceId.Value);

                if (ignoreReservationId is not null)
                    resourceReservations = resourceReservations.Where(r => r.Id != ignoreReservationId.Value);

                resourceOverlap = await resourceReservations
                    .Where(r => r.StartTime < end && r.EndTime > start)
                    .AnyAsync(ct);
            }

            var reservationOverlap = providerOverlap || resourceOverlap;

            // Provider-created blocked times conflict with this window.
            var providerBlocked = await _db.BlockedTimes
                .Where(b => b.OrganizationId == organizationId && !b.IsDeleted)
                .Where(b => b.CreatedByUserId == serviceProviderId)
                .Where(b => b.StartTime < end && b.EndTime > start)
                .AnyAsync(ct);

            // Resource-level blocked times (if a resource is involved).
            var resourceBlocked = await IsResourceBlockedAsync(
                organizationId, resourceId, start, end, ct);

            // Availability window coverage (weekly rules, evaluated in org local time).
            var fullyWithinAvailability = await IsFullyWithinProviderAvailabilityAsync(
                organizationId, serviceProviderId, start, end, ct);

            return new ReservationConflictResult(
                ReservationOverlap: reservationOverlap,
                ProviderBlocked: providerBlocked,
                ResourceBlocked: resourceBlocked,
                OutsideProviderAvailability: !fullyWithinAvailability
            );
        }

        /// <summary>
        /// Calculates conflicts for a proposed blocked time window.
        /// (Note: blocked times are allowed regardless of ProviderAvailability.)
        /// </summary>
        private async Task<BlockedTimeConflictResult> ComputeBlockedTimeConflictsAsync(
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? ignoreBlockedTimeId,
            CancellationToken ct)
        {
            // Would this block cover existing reservations? (provider or same resource)
            var reservations = _db.Reservations
                .Where(r => r.OrganizationId == organizationId && !r.IsDeleted)
                .Where(r =>
                    r.ServiceProviderId == createdByUserId
                    || (resourceId != null && r.ResourceId != null && r.ResourceId == resourceId));

            var overlapsReservations = await reservations
                .Where(r => r.StartTime < end && r.EndTime > start)
                .AnyAsync(ct);

            // Does this block overlap other blocks for the same provider/resource? (exclude self on update)
            var blocks = _db.BlockedTimes
                .Where(b => b.OrganizationId == organizationId && !b.IsDeleted)
                .Where(b =>
                    b.CreatedByUserId == createdByUserId
                    || (resourceId != null && b.ResourceId != null && b.ResourceId == resourceId));

            if (ignoreBlockedTimeId is not null)
                blocks = blocks.Where(b => b.Id != ignoreBlockedTimeId.Value);

            var overlapsOtherBlocks = await blocks
                .Where(b => b.StartTime < end && b.EndTime > start)
                .AnyAsync(ct);

            return new BlockedTimeConflictResult(
                OverlapsReservations: overlapsReservations,
                OverlapsOtherBlocks: overlapsOtherBlocks
            );
        }

        /// <summary>
        /// Determines whether a resource is blocked for the specified time window.
        /// </summary>
        private async Task<bool> IsResourceBlockedAsync(
            string organizationId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken ct)
        {
            if (resourceId is null)
                return false;

            return await _db.BlockedTimes
                .Where(b => b.OrganizationId == organizationId && !b.IsDeleted)
                .Where(b => b.ResourceId != null && b.ResourceId == resourceId)
                .Where(b => b.StartTime < end && b.EndTime > start)
                .AnyAsync(ct);
        }

        // --------------------------------------------------------------------
        // ProviderAvailability coverage (weekly local rules)
        // --------------------------------------------------------------------

        /// <summary>
        /// Returns true if the <c>[start, end)</c> window is fully covered by one or more
        /// <c>ProviderAvailability</c> rows for the provider, evaluated in the org's local time.
        /// Spanning midnight is supported: each local-day segment must be covered by a single row.
        /// </summary>
        private async Task<bool> IsFullyWithinProviderAvailabilityAsync(
            string organizationId,
            string serviceProviderId,
            DateTimeOffset startUtc,
            DateTimeOffset endUtc,
            CancellationToken ct)
        {
            if (endUtc <= startUtc) return false;

            var tzId = await _db.OrganizationSettings
                .Where(x => x.OrganizationId == organizationId)
                .Select(x => x.TimeZoneId)
                .AsNoTracking()
                .FirstOrDefaultAsync(ct) ?? "UTC";

            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);

            var startLocal = TimeZoneInfo.ConvertTime(startUtc, tz);
            var endLocal = TimeZoneInfo.ConvertTime(endUtc, tz);

            var cur = startLocal;
            while (cur < endLocal)
            {
                // End of the current local day (next midnight in local time)
                var nextMidnightLocalDate = cur.Date.AddDays(1);
                var nextMidnightOffset = new DateTimeOffset(
                    nextMidnightLocalDate,
                    tz.GetUtcOffset(nextMidnightLocalDate));

                var segEnd = endLocal < nextMidnightOffset ? endLocal : nextMidnightOffset;

                // Defensive: skip zero-length segments
                if (segEnd <= cur)
                {
                    cur = segEnd;
                    continue;
                }

                var segDateOnly = DateOnly.FromDateTime(cur.Date);
                var segDay = cur.DayOfWeek;
                var segStartT = cur.TimeOfDay;
                var segEndT = segEnd.TimeOfDay; // 00:00 allowed (end-of-day)

                // A single availability row must fully cover this local-day segment
                var covered = await _db.ProviderAvailabilities
                    .Where(a => a.OrganizationId == organizationId && !a.IsDeleted)
                    .Where(a => a.ServiceProviderId == serviceProviderId)
                    .Where(a => a.DayOfWeek == segDay)
                    .Where(a => a.EffectiveFrom <= segDateOnly && a.EffectiveTo >= segDateOnly)
                    .Where(a => a.StartLocalTime <= segStartT && a.EndLocalTime >= segEndT)
                    .AnyAsync(ct);

                if (!covered) return false;

                cur = segEnd;
            }

            return true;
        }
    }
}
