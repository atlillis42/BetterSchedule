namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    /// <summary>
    /// Patch-style payload to update an existing reservation. Provide only the fields to change.
    /// </summary>
    public class UpdateReservationDto
    {
        /// <summary>New service provider identifier, if changing.</summary>
        public string? ServiceProviderId { get; init; }

        /// <summary>New appointment type identifier, if changing.</summary>
        public int? AppointmentTypeId { get; init; }

        /// <summary>New absolute start timestamp (UTC-capable), if changing.</summary>
        public DateTimeOffset? StartTime { get; init; }

        /// <summary>New absolute end timestamp (UTC-capable), if changing.</summary>
        public DateTimeOffset? EndTime { get; init; }

        /// <summary>New assigned resource identifier, if changing.</summary>
        public int? ResourceId { get; init; }

        /// <summary>New package assignment identifier, if changing.</summary>
        public int? PackageAssignmentId { get; init; }

        /// <summary>New notes, if changing.</summary>
        public string? Notes { get; init; }

        /// <summary>
        /// New lifecycle state, if changing. One of: "Booked", "Completed", "Canceled", "NoShow".
        /// </summary>
        public string? Status { get; init; }

        /// <summary>
        /// Optional free-form cancel reason to annotate a cancel status change (e.g., "ClientRequest", "StaffAction", "Weather").
        /// Server may default if not provided.
        /// </summary>
        public string? CancelReason { get; init; }
    }
}
