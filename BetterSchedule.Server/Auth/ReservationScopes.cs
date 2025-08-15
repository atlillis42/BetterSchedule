using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    public static class ReservationScopes
    {
        // Org + role filter
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

            if (isManager) return q; // Managers see all in org
            if (isProvider) return q.Where(r => r.ServiceProviderId == userId);
            if (isClient) return q.Where(r => r.ClientId == userId);

            // No recognized role → nothing
            return q.Where(_ => false);
        }

        // Optional time-window overlap
        public static IQueryable<Reservation> Overlapping(
            this IQueryable<Reservation> query,
            DateTimeOffset? start,
            DateTimeOffset? end)
        {
            if (start.HasValue && end.HasValue)
                return query.Where(r => r.StartTime < end.Value && r.EndTime > start.Value);
            return query;
        }

        // Modify Permissions
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