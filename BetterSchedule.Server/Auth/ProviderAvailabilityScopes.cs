using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    public static class ProviderAvailabilityScopes
    {
        /// <summary>
        /// Visibility: Managers see all in org; Providers see only their own; others see none.
        /// </summary>
        public static IQueryable<ProviderAvailability> VisibleTo(
            this IQueryable<ProviderAvailability> q,
            string organizationId,
            string userId,
            bool isManager,
            bool isProvider,
            bool isClient)
        {
            // Everyone in organization can see availability, excluding soft-deleted
            return q.Where(a => a.OrganizationId == organizationId && !a.IsDeleted);
        }

        /// <summary>
        /// Editability: Managers can edit all; Providers can edit only their own.
        /// </summary>
        public static IQueryable<ProviderAvailability> EditableBy(
            this IQueryable<ProviderAvailability> q,
            string organizationId,
            string userId,
            bool isManager,
            bool isProvider)
        {
            q = q.Where(a => a.OrganizationId == organizationId && !a.IsDeleted);

            if (isManager) return q;
            if (isProvider) return q.Where(a => a.ServiceProviderId == userId);

            return q.Where(a => false);
        }
    }
}
