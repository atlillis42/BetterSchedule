using System;
using System.Threading;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Services.Scheduling
{
    public sealed record ReservationConflictResult(
        bool ReservationOverlap,
        bool ProviderBlocked,
        bool ResourceBlocked
    );

    public sealed record BlockedTimeConflictResult(
        bool OverlapsReservations,
        bool OverlapsOtherBlocks
    );

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
