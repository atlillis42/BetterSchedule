
namespace BetterSchedule.Server.Models.DTOs.Organization
{
    public class UpdateOrgSettingsDto
    {
        public TimeSpan? BookingLeadTime { get; init; }
        public TimeSpan? CancellationWindow { get; init; }
    }
}