using System;
using System.Threading;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Services.Scheduling
{
    /// <summary>
    /// Contract for computing scheduling conflicts across reservations and blocked time,
    /// and validating that reservations fall within provider availability windows.
    /// </summary>
    public interface ISchedulingConflictService
    {
        /// <summary>
        /// Checks conflicts for a new reservation proposal.
        /// </summary>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="serviceProviderId">Target provider.</param>
        /// <param name="start">Start of the reservation (UTC).</param>
        /// <param name="end">End of the reservation (UTC).</param>
        /// <param name="resourceId">Optional resource to be reserved.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict flags for the proposed reservation.</returns>
        Task<ReservationConflictResult> CheckReservationCreateAsync(
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks conflicts when updating an existing reservation (excludes that row from overlap checks).
        /// </summary>
        /// <param name="reservationId">Existing reservation id to ignore for self-overlap.</param>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="serviceProviderId">Effective provider after update.</param>
        /// <param name="start">Effective start (UTC).</param>
        /// <param name="end">Effective end (UTC).</param>
        /// <param name="resourceId">Effective resource after update.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict flags for the proposed change.</returns>
        Task<ReservationConflictResult> CheckReservationUpdateAsync(
            int reservationId,
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks conflicts for a new blocked-time window.
        /// </summary>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="createdByUserId">The creating user id (provider id when PTO/self-block).</param>
        /// <param name="resourceId">Optional resource to block (null for provider self-block).</param>
        /// <param name="start">Start of the block (UTC).</param>
        /// <param name="end">End of the block (UTC).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict flags for the proposed block.</returns>
        Task<BlockedTimeConflictResult> CheckBlockedTimeCreateAsync(
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks conflicts when updating an existing blocked-time window (excludes that row from overlap checks).
        /// </summary>
        /// <param name="blockedTimeId">Existing block id to ignore for self-overlap.</param>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="createdByUserId">The creating user id (provider id when PTO/self-block).</param>
        /// <param name="resourceId">Optional resource to block (null for provider self-block).</param>
        /// <param name="start">Effective start (UTC).</param>
        /// <param name="end">Effective end (UTC).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict flags for the proposed change.</returns>
        Task<BlockedTimeConflictResult> CheckBlockedTimeUpdateAsync(
            int blockedTimeId,
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken);
    }

    /// <summary>
    /// Result of reservation-conflict evaluation.
    /// </summary>
    /// <param name="ReservationOverlap">
    /// True when the window overlaps an existing reservation for the same provider
    /// or (when a resource is specified) an existing reservation on that resource.
    /// </param>
    /// <param name="ProviderBlocked">True when a provider-created block overlaps the window.</param>
    /// <param name="ResourceBlocked">True when a resource-level block overlaps the window.</param>
    /// <param name="OutsideProviderAvailability">True when the window is not fully covered by provider availability.</param>
    public readonly record struct ReservationConflictResult(
        bool ReservationOverlap,
        bool ProviderBlocked,
        bool ResourceBlocked,
        bool OutsideProviderAvailability
    );

    /// <summary>
    /// Result of blocked-time conflict evaluation.
    /// </summary>
    /// <param name="OverlapsReservations">True when the block would cover an existing reservation.</param>
    /// <param name="OverlapsOtherBlocks">True when the block overlaps another block for the same provider/resource.</param>
    public readonly record struct BlockedTimeConflictResult(
        bool OverlapsReservations,
        bool OverlapsOtherBlocks
    );
}
