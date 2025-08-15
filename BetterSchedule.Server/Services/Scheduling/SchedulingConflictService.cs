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
    /// All time math uses the same overlap predicate: (start1 < end2 && end1 > start2).
    /// All queries are scoped by OrganizationId and exclude soft-deleted rows.
    /// Update variants exclude the current row by ID to avoid self-overlap.
    /// </summary>
    public sealed class SchedulingConflictService : ISchedulingConflictService
    {
        private readonly ApplicationDbContext _db;

        public SchedulingConflictService(ApplicationDbContext db)
        {
            _db = db;
        }

        // --------------------------------------------------------------------
        // Public API (thin wrappers) — keeps existing controller calls unchanged
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

            return new ReservationConflictResult(
                ReservationOverlap: reservationOverlap,
                ProviderBlocked: providerBlocked,
                ResourceBlocked: resourceBlocked
            );
        }

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
    }
}
