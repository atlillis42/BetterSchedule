using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business
{
    /// <summary>
    /// Records the consumption of package uses against a reservation.
    /// Serves as an audit log tying a package assignment to one booking instance.
    /// </summary>
    public class PackageRedemption
    {
        /// <summary>Unique identifier for the redemption record.</summary>
        public int Id { get; set; }

        /// <summary>Identifier of the owning organization.</summary>
        [Required]
        public string OrganizationId { get; set; } = default!;

        /// <summary>Identifier of the package assignment being consumed.</summary>
        [Required]
        public int PackageAssignmentId { get; set; }

        /// <summary>Identifier of the reservation the uses were applied to.</summary>
        [Required]
        public int ReservationId { get; set; }

        /// <summary>Number of uses consumed by this redemption.</summary>
        [Required, Range(1, int.MaxValue)]
        public int Uses { get; set; } = 1;

        /// <summary>Creation timestamp (UTC).</summary>
        [Required]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
