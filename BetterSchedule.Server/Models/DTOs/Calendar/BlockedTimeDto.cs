namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public sealed record BlockedTimeDto
    {
        public int Id { get; init; }
        public string Reason { get; init; } = default!;
        public DateTimeOffset StartTime { get; init; }
        public DateTimeOffset EndTime { get; init; }
        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
        public bool IsDeleted { get; init; }
    }
}
