using System;
using System.Collections.Generic;

namespace BetterSchedule.Server.Services.Time
{
    /// <summary>
    /// Production clock using the system time.
    /// Accepts either IANA or Windows time zone identifiers on all platforms.
    /// </summary>
    public sealed class SystemDateTimeProvider : IDateTimeProvider
    {
        /// <inheritdoc />
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

        /// <inheritdoc />
        public DateOnly TodayInTimeZone(string timeZoneId)
        {
            var tz = ResolveTimeZone(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(UtcNow, tz);
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
                // Works if the ID is "native" for this OS (Windows IDs on Windows, IANA on Linux/macOS)
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                // Minimal IANA→Windows map (extend as needed)
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

                // Last resort: UTC
                return TimeZoneInfo.Utc;
            }
        }
    }
}
