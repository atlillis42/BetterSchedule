namespace BetterSchedule.Server.Services.Time
{
    public sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        /// <summary>Deterministic clock for tests.</summary>
        private readonly DateTimeOffset _utcNow;

        public FixedDateTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;
        public DateTimeOffset UtcNow => _utcNow;

        public DateOnly TodayInTimeZone(string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(_utcNow, tz);
            return DateOnly.FromDateTime(local.Date);
        }

        public DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return TimeZoneInfo.ConvertTime(instant, tz);
        }
    }
}
