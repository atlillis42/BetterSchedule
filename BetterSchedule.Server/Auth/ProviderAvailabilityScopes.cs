using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    public static class ProviderAvailabilityScopes
    {
        public static IQueryable<ProviderAvailability> VisibleTo(
            this IQueryable<ProviderAvailability> query,
            string orgId,
            string? userId,
            bool isManager,
            bool isProvider)
        {
            var q = query.AsNoTracking()
                         .Where(pa => pa.OrganizationId == orgId && !pa.IsDeleted);

            if (isManager) return q;
            if (isProvider) return q.Where(pa => pa.ProviderId == userId);
            return q.Where(_ => false);
        }

        public static bool CanModify(
            ProviderAvailability pa,
            string? userId,
            bool isManager,
            bool isProvider)
        {
            if (isManager) return true;
            if (isProvider) return pa.ProviderId == userId;
            return false;
        }
    }
}