namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public record BlockedTimeCreateDto
    {
        public string Reason { get; init; } = default!;
        public DateTimeOffset StartTime { get; init; }
        public DateTimeOffset EndTime { get; init; }
        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
    }
}
