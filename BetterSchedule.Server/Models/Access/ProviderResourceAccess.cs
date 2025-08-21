using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;

namespace BetterSchedule.Server.Models.Access
{
    /// <summary>
    /// Grants a provider access to a calendar resource within an organization.
    /// Policy/permission link; org-scoped and soft-deletable.
    /// </summary>
    public sealed class ProviderResourceAccess
    {
        public int Id { get; set; }

        /// <summary>Owning organization (scope boundary).</summary>
        public string OrganizationId { get; init; } = default!;

        /// <summary>Provider (ApplicationUser) who is granted access.</summary>
        public string UserId { get; init; } = default!;
        public ApplicationUser? User { get; set; }

        /// <summary>Resource the provider may use.</summary>
        public int ResourceId { get; init; }
        public CalendarResource? Resource { get; set; }

        /// <summary>Soft-delete flag for safe unassign.</summary>
        public bool IsDeleted { get; set; }

        /// <summary>Audit timestamp for creation.</summary>
        public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
