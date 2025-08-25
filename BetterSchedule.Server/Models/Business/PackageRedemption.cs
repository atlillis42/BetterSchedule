using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Business;

public class PackageRedemption
{
    public int Id { get; set; }

    [Required]
    public string OrganizationId { get; set; } = default!;

    [Required]
    public int PackageAssignmentId { get; set; }

    [Required]
    public int ReservationId { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int Uses { get; set; } = 1;

    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
