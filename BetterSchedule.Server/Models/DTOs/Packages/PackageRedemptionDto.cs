namespace BetterSchedule.Server.Models.DTOs.Packages
{
    public sealed class PackageRedemptionDto
    {
        public int Id { get; set; }
        public string OrganizationId { get; set; } = default!;
        public int PackageAssignmentId { get; set; }
        public int ReservationId { get; set; }
        public int Uses { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}