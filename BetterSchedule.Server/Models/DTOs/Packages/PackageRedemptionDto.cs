using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Packages
{
    /// <summary>
    /// Read model for a redemption record that consumes uses from a package assignment for a reservation.
    /// Mirrors <see cref="BetterSchedule.Server.Models.Business.PackageRedemption"/>.
    /// </summary>
    public sealed class PackageRedemptionDto
    {
        /// <summary>Identifier of the redemption record.</summary>
        [Required]
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
        [Required]
        public int Uses { get; set; }

        /// <summary>Creation timestamp (UTC).</summary>
        [Required]
        public DateTimeOffset CreatedAt { get; set; }
    }
}
