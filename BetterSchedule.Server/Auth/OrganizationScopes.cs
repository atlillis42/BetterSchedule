namespace BetterSchedule.Server.Auth
{
    public static class OrganizationScopes
    {
        public interface IOrganizationOwned
        {
            string OrganizationId { get; }
            bool IsDeleted { get; }
        }

        public static IQueryable<T> InOrganization<T>(this IQueryable<T> q, string organizationId)
            where T : IOrganizationOwned
            => q.Where(x => x.OrganizationId == organizationId && !x.IsDeleted);
    }
}
