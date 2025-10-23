using System;

namespace BetterSchedule.Server.Options
{
    /// <summary>
    /// Rate limit knobs for authentication endpoints (e.g., login/register).
    /// Values are bound from configuration: "Auth:RateLimit".
    /// </summary>
    public sealed class AuthRateLimitOptions
    {
        /// <summary>
        /// Fixed-window length in seconds (e.g., 60 = 1 minute).
        /// </summary>
        public int WindowSeconds { get; set; } = 60;

        /// <summary>
        /// Max auth requests allowed per IP per window.
        /// Keep modest to reduce brute-force pressure without harming UX.
        /// </summary>
        public int MaxRequestsPerIp { get; set; } = 20;
    }
}
