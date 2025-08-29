using System;
using BetterSchedule.Server.Models.Scheduling;

namespace BetterSchedule.Server.Models.Access
{
    /// <summary>
    /// Organization-scoped permission linking an <see cref="AppointmentType"/> to a permitted <see cref="CalendarResource"/>.
    /// Used with <see cref="Tenant.OrganizationSettings.EnforceAppointmentTypeResourceRules"/> to restrict valid resource choices.
    /// </summary>
    public sealed class AppointmentTypeResourceAccess
    {
        /// <summary>Surrogate primary key.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        public string OrganizationId { get; init; } = default!;

        /// <summary>Identifier of the appointment type that is permitted to use the resource.</summary>
        public int AppointmentTypeId { get; init; }

        /// <summary>Navigation to the appointment type.</summary>
        public AppointmentType? AppointmentType { get; set; }

        /// <summary>Identifier of the permitted calendar resource.</summary>
        public int ResourceId { get; init; }

        /// <summary>Navigation to the permitted calendar resource.</summary>
        public CalendarResource? Resource { get; set; }

        /// <summary>Whether this link is soft deleted (safe unassign).</summary>
        public bool IsDeleted { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    }
}
