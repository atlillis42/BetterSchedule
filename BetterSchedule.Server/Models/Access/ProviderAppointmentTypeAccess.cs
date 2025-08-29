using System;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;

namespace BetterSchedule.Server.Models.Access
{
    /// <summary>
    /// Organization-scoped permission linking a provider (<see cref="ApplicationUser"/>) to a permitted <see cref="AppointmentType"/>.
    /// Honors <see cref="Tenant.OrganizationSettings.LimitProvidersToAssignedAppointmentTypes"/>.
    /// </summary>
    public sealed class ProviderAppointmentTypeAccess
    {
        /// <summary>Surrogate primary key.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        public string OrganizationId { get; init; } = default!;

        /// <summary>Identifier of the provider who is granted access.</summary>
        public string UserId { get; init; } = default!;

        /// <summary>Navigation to the provider.</summary>
        public ApplicationUser? User { get; set; }

        /// <summary>Identifier of the appointment type the provider may perform.</summary>
        public int AppointmentTypeId { get; init; }

        /// <summary>Navigation to the appointment type.</summary>
        public AppointmentType? AppointmentType { get; set; }

        /// <summary>Whether this link is soft deleted (safe unassign).</summary>
        public bool IsDeleted { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
