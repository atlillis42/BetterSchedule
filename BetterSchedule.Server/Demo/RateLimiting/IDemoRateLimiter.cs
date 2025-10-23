using System;

namespace BetterSchedule.Server.Services.Demo
{
    public interface IDemoRateLimiter
    {
        /// <summary>Returns true if the call is allowed; otherwise false and the suggested retry-after.</summary>
        bool TryConsume(string key, out TimeSpan retryAfter);
    }
}
