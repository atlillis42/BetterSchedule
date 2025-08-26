namespace BetterSchedule.Server.Services.Time
{
    public sealed class SystemDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

        public DateOnly TodayInTimeZone(string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(UtcNow, tz);
            return DateOnly.FromDateTime(local.Date);
        }

        public DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return TimeZoneInfo.ConvertTime(instant, tz);
        }
    }
}
