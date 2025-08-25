namespace BetterSchedule.Server.Services.Time
{
    public interface IDateTimeProvider
    {
        DateTimeOffset UtcNow { get; }                     // single source of “now”
        DateOnly TodayInTimeZone(string timeZoneId);       // e.g., org-local “today”
        DateTimeOffset ConvertToTimeZone(DateTimeOffset instant, string timeZoneId);
    }
}
