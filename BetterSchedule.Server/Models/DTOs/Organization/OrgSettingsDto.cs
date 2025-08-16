
namespace BetterSchedule.Server.Models.DTOs.Organization
{
    public class OrgSettingsDto
    {
        public TimeSpan? BookingLeadTime { get; init; }
        public TimeSpan? CancellationWindow { get; init; }
    }
}
