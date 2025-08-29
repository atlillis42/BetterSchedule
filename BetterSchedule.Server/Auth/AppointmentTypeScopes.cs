using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Scope helpers for <see cref="AppointmentType"/> visibility and modify-ability.
    /// All queries are org-scoped and exclude soft-deleted rows.
    /// </summary>
    public static class AppointmentTypeScopes
    {
        /// <summary>
        /// Filters appointment types visible to the caller by role.
        /// </summary>
        /// <param name="query">Base query.</param>
        /// <param name="orgId">Organization scope identifier.</param>
        /// <param name="userId">Caller user id (used for provider scoping).</param>
        /// <param name="isManager">Whether the caller is a Manager.</param>
        /// <param name="isProvider">Whether the caller is a Service Provider.</param>
        /// <param name="isClient">Whether the caller is a Client.</param>
        /// <returns>
        /// Org-scoped, non-deleted rows matching role visibility:
        /// Managers → all; Providers → public or created by self; Clients → public; otherwise none.
        /// </returns>
        public static IQueryable<AppointmentType> VisibleTo(
            this IQueryable<AppointmentType> query,
            string orgId, string? userId,
            bool isManager, bool isProvider, bool isClient)
        {
            var q = query.AsNoTracking()
                         .Where(a => a.OrganizationId == orgId && !a.IsDeleted);

            if (isManager) return q;
            if (isProvider) return q.Where(a => a.IsPublic || a.CreatedByUserId == userId);
            if (isClient) return q.Where(a => a.IsPublic);

            return q.Where(_ => false);
        }

        /// <summary>
        /// Determines whether the caller can modify the given appointment type.
        /// </summary>
        /// <param name="a">Appointment type entity.</param>
        /// <param name="userId">Caller user id.</param>
        /// <param name="isManager">Is Manager.</param>
        /// <param name="isProvider">Is Service Provider.</param>
        /// <param name="isClient">Is Client.</param>
        /// <returns>
        /// <c>true</c> for Managers; for Providers only when they created the type; otherwise <c>false</c>.
        /// </returns>
        public static bool CanModify(
            AppointmentType a, string? userId,
            bool isManager, bool isProvider, bool isClient)
        {
            if (isManager) return true;
            if (isProvider) return a.CreatedByUserId == userId;
            return false;
        }
    }
}
