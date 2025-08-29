using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Scope helpers for <see cref="BlockedTime"/> visibility and modify-ability.
    /// </summary>
    public static class BlockedTimeScopes
    {
        /// <summary>
        /// Returns org-scoped, non-deleted blocked times visible to the caller.
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

        /// <summary>
        /// Optional temporal overlap filter using <c>[start, end)</c> semantics.
        /// </summary>
        public static IQueryable<BlockedTime> Overlapping(
            this IQueryable<BlockedTime> query,
            DateTimeOffset? start,
            DateTimeOffset? end)
        {
            if (start.HasValue && end.HasValue)
                return query.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);
            return query;
        }

        /// <summary>
        /// Determines whether the caller can modify (create/update/delete) a block.
        /// </summary>
        /// <returns>
        /// <c>true</c> for Managers; for Providers when they created the block; otherwise <c>false</c>.
        /// </returns>
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
