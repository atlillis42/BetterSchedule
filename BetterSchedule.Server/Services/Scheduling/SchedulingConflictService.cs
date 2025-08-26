using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Services.Scheduling
{
    /// <summary>
    /// Shared availability/conflict checks used by Reservations and BlockedTimes.
    /// Overlap predicate: (start1 < end2 && end1 > start2).
    /// Queries are scoped by OrganizationId and exclude soft-deleted rows.
    /// Update variants exclude the current row by ID to avoid self-overlap.
    /// Also validates that reservations lie within ProviderAvailability windows
    /// (weekly rules in local org time).
    /// </summary>
    public sealed class SchedulingConflictService : ISchedulingConflictService
    {
        private readonly ApplicationDbContext _db;

        public SchedulingConflictService(ApplicationDbContext db) => _db = db;

        // --------------------------------------------------------------------
        // Public API (thin wrappers)
        // --------------------------------------------------------------------

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
            // Overlap with other reservations for the same provider (exclude self on update).
            var reservations = _db.Reservations
                .Where(r => r.OrganizationId == organizationId && !r.IsDeleted)
                .Where(r => r.ServiceProviderId == serviceProviderId);

            if (ignoreReservationId is not null)
                reservations = reservations.Where(r => r.Id != ignoreReservationId.Value);

            bool reservationOverlap = await reservations
                .Where(r => r.StartTime < end && r.EndTime > start)
                .AnyAsync(ct);

            // Provider-created blocked times conflict with this window.
            bool providerBlocked = await _db.BlockedTimes
                .Where(b => b.OrganizationId == organizationId && !b.IsDeleted)
                .Where(b => b.CreatedByUserId == serviceProviderId)
                .Where(b => b.StartTime < end && b.EndTime > start)
                .AnyAsync(ct);

            // Resource-level block (if a resource is involved).
            bool resourceBlocked = await IsResourceBlockedAsync(
                organizationId, resourceId, start, end, ct);

            // Availability window coverage (weekly rules, evaluated in org local time).
            bool fullyWithinAvailability = await IsFullyWithinProviderAvailabilityAsync(
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

            bool overlapsReservations = await reservations
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

            bool overlapsOtherBlocks = await blocks
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
        /// Returns true if the [start, end) window is fully covered by one or more
        /// ProviderAvailability rows for the given provider, evaluated in the org's local time.
        /// Spanning midnight is supported: each day-segment must be covered by a matching row.
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
                .FirstOrDefaultAsync(ct) ?? "America/New_York";
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);

            var startLocal = TimeZoneInfo.ConvertTime(startUtc, tz);
            var endLocal = TimeZoneInfo.ConvertTime(endUtc, tz);

            var cur = startLocal;
            while (cur < endLocal)
            {
                // End of the current local day (next midnight in local time)
                var nextMidnightLocalDate = cur.Date.AddDays(1);

                // Build a DateTimeOffset at next midnight using that local day's offset
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
                var segEndT = segEnd.TimeOfDay; // 00:00 is allowed (end-of-day)

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
