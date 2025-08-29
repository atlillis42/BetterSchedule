using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Scope helpers for <see cref="Reservation"/> visibility and modify-ability.
    /// </summary>
    public static class ReservationScopes
    {
        /// <summary>
        /// Returns org-scoped, non-deleted reservations visible to the caller by role:
        /// Managers → all; Providers → their own; Clients → their own; others → none.
        /// </summary>
        public static IQueryable<Reservation> VisibleTo(
            this IQueryable<Reservation> query,
            string orgId,
            string? userId,
            bool isManager,
            bool isProvider,
            bool isClient)
        {
            var q = query.AsNoTracking()
                .Where(r => r.OrganizationId == orgId && !r.IsDeleted);

            if (isManager) return q;
            if (isProvider) return q.Where(r => r.ServiceProviderId == userId);
            if (isClient) return q.Where(r => r.ClientId == userId);

            return q.Where(_ => false);
        }

        /// <summary>
        /// Optional temporal overlap filter using <c>[start, end)</c> semantics.
        /// </summary>
        public static IQueryable<Reservation> Overlapping(
            this IQueryable<Reservation> query,
            DateTimeOffset? start,
            DateTimeOffset? end)
        {
            if (start.HasValue && end.HasValue)
                return query.Where(r => r.StartTime < end.Value && r.EndTime > start.Value);
            return query;
        }

        /// <summary>
        /// Determines whether the caller can modify a reservation.
        /// </summary>
        /// <remarks>
        /// Controllers may choose to disable client edits by passing <c>isClient: false</c>
        /// even if the current principal has the Client role. See <c>ReservationController</c>.
        /// </remarks>
        public static bool CanModify(
            Reservation r,
            string? userId,
            bool isManager,
            bool isProvider,
            bool isClient)
        {
            if (isManager) return true;
            if (isProvider) return r.ServiceProviderId == userId;
            if (isClient) return r.ClientId == userId;
            return false;
        }
    }
}
