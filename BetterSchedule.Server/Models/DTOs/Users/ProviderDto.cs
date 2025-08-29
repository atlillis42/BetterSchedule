namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Provider record with optional username and email details.
    /// </summary>
    public class ProviderDto : ProviderLiteDto
    {
        /// <summary>Provider username, if available.</summary>
        public string? UserName { get; init; }

        /// <summary>Provider email, if available.</summary>
        public string? Email { get; init; }
  
    }
}
