using System;
using System.Collections.Generic;

namespace BetterSchedule.Server.Services.Time
{
    /// <summary>
    /// Deterministic clock for tests; returns a fixed instant supplied at construction.
    /// Accepts either IANA or Windows time zone identifiers on all platforms.
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
            var tz = ResolveTimeZone(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(_utcNow, tz);
            return DateOnly.FromDateTime(local.DateTime);
        }

        /// <inheritdoc />
        public DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId)
        {
            var tz = ResolveTimeZone(timeZoneId);
            return TimeZoneInfo.ConvertTime(instant, tz);
        }

        /// <summary>
        /// Resolves an IANA or Windows time zone ID to a <see cref="TimeZoneInfo"/> on the current platform.
        /// Falls back to UTC for unknown IDs.
        /// </summary>
        private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
                return TimeZoneInfo.Utc;

            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                var ianaToWindows = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["UTC"] = "UTC",
                    ["Etc/UTC"] = "UTC",
                    ["America/New_York"] = "Eastern Standard Time",
                    ["America/Chicago"] = "Central Standard Time",
                    ["America/Denver"] = "Mountain Standard Time",
                    ["America/Los_Angeles"] = "Pacific Standard Time",
                    ["Europe/London"] = "GMT Standard Time"
                };

                if (ianaToWindows.TryGetValue(timeZoneId, out var windowsId))
                {
                    try { return TimeZoneInfo.FindSystemTimeZoneById(windowsId); }
                    catch (TimeZoneNotFoundException) { /* fall through to UTC */ }
                }

                return TimeZoneInfo.Utc;
            }
        }
    }
}
