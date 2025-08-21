using System;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;

namespace BetterSchedule.Server.Models.Access
{
    /// <summary>
    /// Grants a provider access to perform a specific appointment type within an organization.
    /// Policy/permission link (many-to-many): Provider (ApplicationUser) ↔ AppointmentType.
    /// Soft-deletable to allow safe unassign without losing history.
    /// </summary>
    public sealed class ProviderAppointmentTypeAccess
    {
        /// <summary>
        /// Surrogate primary key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Owning organization (scope boundary).
        /// </summary>
        public string OrganizationId { get; init; } = default!;

        /// <summary>
        /// Provider (ApplicationUser) who is granted access.
        /// </summary>
        public string UserId { get; init; } = default!;

        /// <summary>
        /// Navigation to the provider.
        /// </summary>
        public ApplicationUser? User { get; set; }

        /// <summary>
        /// Appointment type that the provider may perform.
        /// Works for both org-owned and provider-created types.
        /// </summary>
        public int AppointmentTypeId { get; init; }

        /// <summary>
        /// Navigation to the appointment type.
        /// </summary>
        public AppointmentType? AppointmentType { get; set; }

        /// <summary>
        /// Soft-delete flag for safe unassign.
        /// </summary>
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Audit timestamp for creation.
        /// </summary>
        public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
