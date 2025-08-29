using System;

namespace BetterSchedule.Server.Services.Time
{
    /// <summary>
    /// Abstraction for time access and conversions to support deterministic tests.
    /// </summary>
    public interface IDateTimeProvider
    {
        /// <summary>
        /// Current instant in UTC. Single source of “now”.
        /// </summary>
        DateTimeOffset UtcNow { get; }

        /// <summary>
        /// Returns the current local date (“today”) in the specified time zone.
        /// </summary>
        /// <param name="timeZoneId">IANA/Windows time zone id.</param>
        /// <returns>Local date in the given time zone.</returns>
        DateOnly TodayInTimeZone(string timeZoneId);

        /// <summary>
        /// Converts an instant to the specified time zone, preserving the instant.
        /// </summary>
        /// <param name="instant">UTC or offset-based instant.</param>
        /// <param name="timeZoneId">IANA/Windows time zone id.</param>
        /// <returns>Instant represented in the target zone with its local offset.</returns>
        DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId);
    }
}
