namespace BetterSchedule.Server.Options
{
    public sealed class DemoRateLimitOptions
    {
        /// <summary>Fixed-window length in seconds (e.g., 60 = 1 minute).</summary>
        public int WindowSeconds { get; set; } = 300;

        /// <summary>Max /api/demo/start calls allowed per IP per window.</summary>
        public int MaxStartsPerIp { get; set; } = 10;
    }
}