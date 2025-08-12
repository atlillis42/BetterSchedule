using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    public static class BlockedTimeScopes
    {
        // Visibility: Managers & Providers see org data; others see nothing
        public static IQueryable<BlockedTime> VisibleTo(
            this IQueryable<BlockedTime> query,
            string orgId,
            bool isManager,
            bool isProvider)
        {
            var q = query.AsNoTracking()
                         .Where(b => b.OrganizationId == orgId && !b.IsDeleted);

            if (isManager || isProvider) return q;
            return q.Where(_ => false);
        }

        // Optional time overlap filter
        public static IQueryable<BlockedTime> Overlapping(
            this IQueryable<BlockedTime> query,
            DateTimeOffset? start,
            DateTimeOffset? end)
        {
            if (start.HasValue && end.HasValue)
                return query.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);
            return query;
        }

        // Modify Permissions
        public static bool CanModify(
            BlockedTime b,
            string? userId,
            bool isManager,
            bool isProvider)
        {
            if (isManager) return true;
            if (isProvider)
            {
                return b.CreatedByUserId == userId;
            }
            return false;
        }
    }
}
