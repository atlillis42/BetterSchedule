using System;
using System.Threading;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Services.Scheduling
{
    /// <summary>
    /// Result of checking reservation conflicts.
    /// </summary>
    /// <param name="ReservationOverlap">Indicates whether an overlapping reservation exists.</param>
    /// <param name="ProviderBlocked">Indicates whether the provider has a conflicting blocked time.</param>
    /// <param name="ResourceBlocked">Indicates whether the resource has a conflicting blocked time.</param>
    public sealed record ReservationConflictResult(
        bool ReservationOverlap,
        bool ProviderBlocked,
        bool ResourceBlocked
    );

    /// <summary>
    /// Result of checking blocked time conflicts.
    /// </summary>
    /// <param name="OverlapsReservations">Indicates whether the block overlaps existing reservations.</param>
    /// <param name="OverlapsOtherBlocks">Indicates whether the block overlaps other blocked times.</param>
    public sealed record BlockedTimeConflictResult(
        bool OverlapsReservations,
        bool OverlapsOtherBlocks
    );

    /// <summary>
    /// Service used to detect scheduling conflicts for reservations and blocked times.
    /// </summary>
    public interface ISchedulingConflictService
    {
        /// <summary>
        /// Checks for conflicts when creating a reservation.
        /// </summary>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="serviceProviderId">Service provider identifier.</param>
        /// <param name="start">Proposed reservation start time.</param>
        /// <param name="end">Proposed reservation end time.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict information for the proposed reservation.</returns>
        Task<ReservationConflictResult> CheckReservationCreateAsync(
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks for conflicts when updating an existing reservation.
        /// </summary>
        /// <param name="reservationId">Identifier of the reservation being updated.</param>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="serviceProviderId">Service provider identifier.</param>
        /// <param name="start">Proposed reservation start time.</param>
        /// <param name="end">Proposed reservation end time.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict information for the proposed reservation.</returns>
        Task<ReservationConflictResult> CheckReservationUpdateAsync(
            int reservationId,
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks for conflicts when creating a blocked time window.
        /// </summary>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="createdByUserId">Identifier of the user creating the block.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="start">Proposed block start time.</param>
        /// <param name="end">Proposed block end time.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict information for the proposed block.</returns>
        Task<BlockedTimeConflictResult> CheckBlockedTimeCreateAsync(
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken);

        /// <summary>
        /// Checks for conflicts when updating an existing blocked time window.
        /// </summary>
        /// <param name="blockedTimeId">Identifier of the blocked time being updated.</param>
        /// <param name="organizationId">Organization identifier.</param>
        /// <param name="createdByUserId">Identifier of the user creating the block.</param>
        /// <param name="resourceId">Optional resource identifier.</param>
        /// <param name="start">Proposed block start time.</param>
        /// <param name="end">Proposed block end time.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Conflict information for the proposed block.</returns>
        Task<BlockedTimeConflictResult> CheckBlockedTimeUpdateAsync(
            int blockedTimeId,
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken);
    }
}
