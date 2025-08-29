namespace BetterSchedule.Server.Auth
{
    /// <summary>
    /// Generic org-scoping utilities for entities that carry <c>OrganizationId</c> and <c>IsDeleted</c>.
    /// Useful when you want a uniform filter without entity-specific helpers.
    /// </summary>
    public static class OrganizationScopes
    {
        /// <summary>
        /// Minimal interface that org-owned entities can implement to participate in
        /// generic scoping helpers (e.g., <see cref="InOrganization{T}(IQueryable{T}, string)"/>).
        /// </summary>
        public interface IOrganizationOwned
        {
            /// <summary>The owning organization.</summary>
            string OrganizationId { get; }
            /// <summary>Soft delete flag.</summary>
            bool IsDeleted { get; }
        }

        /// <summary>
        /// Filters an <see cref="IQueryable{T}"/> to rows in a specific organization and not soft-deleted.
        /// </summary>
        /// <typeparam name="T">An entity implementing <see cref="IOrganizationOwned"/>.</typeparam>
        /// <param name="q">Base query.</param>
        /// <param name="organizationId">Organization scope identifier.</param>
        public static IQueryable<T> InOrganization<T>(this IQueryable<T> q, string organizationId)
            where T : IOrganizationOwned
            => q.Where(x => x.OrganizationId == organizationId && !x.IsDeleted);
    }
}
