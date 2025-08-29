using System;

namespace BetterSchedule.Server.Services.Time
{
    /// <summary>
    /// Deterministic clock for tests. Returns a fixed instant.
    /// </summary>
    public sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        /// <summary>Fixed “now” value returned by <see cref="UtcNow"/>.</summary>
        private readonly DateTimeOffset _utcNow;

        /// <summary>
        /// Creates a fixed clock pinned to <paramref name="utcNow"/>.
        /// </summary>
        /// <param name="utcNow">UTC instant to return for <see cref="UtcNow"/>.</param>
        public FixedDateTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;

        /// <inheritdoc />
        public DateTimeOffset UtcNow => _utcNow;

        /// <inheritdoc />
        public DateOnly TodayInTimeZone(string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(_utcNow, tz);
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
