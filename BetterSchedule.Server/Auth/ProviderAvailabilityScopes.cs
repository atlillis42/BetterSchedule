using BetterSchedule.Server.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Scope helpers for <see cref="ProviderAvailability"/>.
    /// <para>
    /// Visibility policy:
    /// <list type="bullet">
    /// <item><description><b>Managers</b>: see all availability in the organization.</description></item>
    /// <item><description><b>Providers</b>: see only their own availability.</description></item>
    /// <item><description><b>Clients</b>: see a provider's availability <b>only if</b> that provider's
    /// <c>AvailabilityPublic</c> flag is enabled.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Notes:
    /// <list type="bullet">
    /// <item><description>All queries are org-scoped and exclude soft-deleted rows.</description></item>
    /// <item><description>Client visibility does not expose <i>why</i> a time is unavailable (e.g., blocks/reservations);
    /// expose open slots via a dedicated availability endpoint rather than raw entities.</description></item>
    /// </list>
    /// </para>
    /// </summary>
    public static class ProviderAvailabilityScopes
    {
        /// <summary>
        /// Filters provider availability rows visible to the caller by role and provider’s <c>AvailabilityPublic</c> flag.
        /// </summary>
        /// <param name="q">Base query.</param>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="userId">Caller’s user id (used for provider scoping).</param>
        /// <param name="isManager">Whether the caller has the Manager role.</param>
        /// <param name="isProvider">Whether the caller has the ServiceProvider role.</param>
        /// <param name="isClient">Whether the caller has the Client role.</param>
        /// <returns>Filtered query suitable for read-only display.</returns>
        public static IQueryable<ProviderAvailability> VisibleTo(
            this IQueryable<ProviderAvailability> q,
            string organizationId,
            string userId,
            bool isManager,
            bool isProvider,
            bool isClient)
        {
            q = q.AsNoTracking()
                 .Where(a => a.OrganizationId == organizationId && !a.IsDeleted);

            if (isManager) return q;

            if (isProvider)
                return q.Where(a => a.ServiceProviderId == userId);

            if (isClient)
                // Clients may view providers who opted in to public availability.
                return q.Where(a => a.ServiceProvider.AvailabilityPublic);

            return q.Where(_ => false);
        }

        /// <summary>
        /// Editability filter for provider availability.
        /// Managers may edit all; Providers may edit only their own rows.
        /// </summary>
        /// <param name="q">Base query.</param>
        /// <param name="organizationId">Organization scope.</param>
        /// <param name="userId">Caller’s user id for self-filtering.</param>
        /// <param name="isManager">Manager role flag.</param>
        /// <param name="isProvider">Provider role flag.</param>
        /// <returns>A query limited to rows the caller can modify.</returns>
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
