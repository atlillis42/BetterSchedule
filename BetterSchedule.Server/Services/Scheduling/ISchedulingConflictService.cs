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
    /// <param name="OutsideProviderAvailability">Indicates the window is not fully covered by provider availability.</param>
    public sealed record ReservationConflictResult(
        bool ReservationOverlap,
        bool ProviderBlocked,
        bool ResourceBlocked,
        bool OutsideProviderAvailability
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
        Task<ReservationConflictResult> CheckReservationCreateAsync(
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        Task<ReservationConflictResult> CheckReservationUpdateAsync(
            int reservationId,
            string organizationId,
            string serviceProviderId,
            DateTimeOffset start,
            DateTimeOffset end,
            int? resourceId,
            CancellationToken cancellationToken);

        Task<BlockedTimeConflictResult> CheckBlockedTimeCreateAsync(
            string organizationId,
            string createdByUserId,
            int? resourceId,
            DateTimeOffset start,
            DateTimeOffset end,
            CancellationToken cancellationToken);

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
