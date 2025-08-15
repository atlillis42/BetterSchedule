namespace BetterSchedule.Server.Models.DTOs.Users
{
    public class ProviderDto : ProviderLiteDto
    {
        public string? UserName { get; init; }
        public string? Email { get; init; }
    }
}
