using System;

namespace BetterSchedule.Server.Services.Time
{
    /// <summary>
    /// Production clock using the system time.
    /// </summary>
    public sealed class SystemDateTimeProvider : IDateTimeProvider
    {
        /// <inheritdoc />
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

        /// <inheritdoc />
        public DateOnly TodayInTimeZone(string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(UtcNow, tz);
            return DateOnly.FromDateTime(local.Date);
        }

        /// <inheritdoc />
        public DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return TimeZoneInfo.ConvertTime(instant, tz);
        }
    }
}
