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

        /// <inheritdoc/>
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

        /// <inheritdoc/>
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

        /// <inheritdoc/>
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

        /// <inheritdoc/>
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
        /// Calculates reservation conflicts for a given provider and optional resource.
        /// </summary>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="serviceProviderId">Service provider identifier.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="start">Proposed reservation start time.</param>
        /// <param name="end">Proposed reservation end time.</param>
        /// <param name="ignoreReservationId">Reservation to exclude from the search (for updates).</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Conflict result for the reservation.</returns>
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

        /// <summary>
        /// Calculates conflicts for a proposed blocked time window.
        /// </summary>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="createdByUserId">Identifier of the user creating the block.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="start">Proposed block start time.</param>
        /// <param name="end">Proposed block end time.</param>
        /// <param name="ignoreBlockedTimeId">Block to exclude from the search (for updates).</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Conflict result for the block.</returns>
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
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="start">Start of the window.</param>
        /// <param name="end">End of the window.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><c>true</c> if the resource is blocked; otherwise <c>false</c>.</returns>
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
