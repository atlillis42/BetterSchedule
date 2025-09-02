using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    /// <summary>Query/permission helpers for <see cref="BlockedTime"/>.</summary>
    public static class BlockedTimeScopes
    {
        /// <summary>
        /// Returns org-scoped, non-deleted blocks visible to the caller.
        /// Managers and Providers see blocks; other roles see none.
        /// </summary>
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

        /// <summary>Filters by range overlap using [start, end) semantics.</summary>
        public static IQueryable<BlockedTime> Overlapping(
            this IQueryable<BlockedTime> query,
            DateTimeOffset? start,
            DateTimeOffset? end)
        {
            if (start.HasValue && end.HasValue)
                return query.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);
            return query;
        }

        /// <summary>Returns whether the caller may modify the block.</summary>
        /// <remarks>Managers always allowed; Providers only for blocks they created.</remarks>
        public static bool CanModify(
            BlockedTime b,
            string? userId,
            bool isManager,
            bool isProvider)
        {
            if (isManager) return true;
            if (isProvider) return b.CreatedByUserId == userId;
            return false;
        }
    }
}
