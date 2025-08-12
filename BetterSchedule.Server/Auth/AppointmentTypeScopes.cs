using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    public static class AppointmentTypeScopes
    {
        // Visibility by role (always org & not deleted)
        public static IQueryable<AppointmentType> VisibleTo(
            this IQueryable<AppointmentType> query,
            string orgId, string? userId,
            bool isManager, bool isProvider, bool isClient)
        {
            var q = query.AsNoTracking()
                         .Where(a => a.OrganizationId == orgId && !a.IsDeleted);

            if (isManager) return q;                                     // Managers see all
            if (isProvider) return q.Where(a => a.IsPublic || a.CreatedByUserId == userId);
            if (isClient) return q.Where(a => a.IsPublic);              // Clients see public only

            return q.Where(_ => false);
        }

        // Modify Permissions
        public static bool CanModify(
            AppointmentType a, string? userId,
            bool isManager, bool isProvider, bool isClient)
        {
            if (isManager) return true;
            if (isProvider) return a.CreatedByUserId == userId;           // Providers: only their own
            return false;                                                 // Clients: never
        }
    }
}
