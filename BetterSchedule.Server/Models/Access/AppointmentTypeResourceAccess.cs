using System;
using BetterSchedule.Server.Models.Scheduling;

namespace BetterSchedule.Server.Models.Access
{
    /// <summary>
    /// Declares which calendar resources a given appointment type may use within an organization.
    /// Policy/permission link (many-to-many): AppointmentType ↔ CalendarResource.
    /// Complements AppointmentType.AssignedResourceId (single default/required) with a flexible set.
    /// Soft-deletable to allow safe unassign without losing history.
    /// </summary>
    public sealed class AppointmentTypeResourceAccess
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
        /// Appointment type that is permitted to use the resource.
        /// </summary>
        public int AppointmentTypeId { get; init; }

        /// <summary>
        /// Navigation to the appointment type.
        /// </summary>
        public AppointmentType? AppointmentType { get; set; }

        /// <summary>
        /// Resource that the appointment type may use.
        /// </summary>
        public int ResourceId { get; init; }

        /// <summary>
        /// Navigation to the calendar resource.
        /// </summary>
        public CalendarResource? Resource { get; set; }

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
