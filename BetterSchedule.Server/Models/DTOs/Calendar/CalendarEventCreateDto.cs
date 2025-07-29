namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public record CalendarEventCreateDto
    {
        public string Text { get; init; } = default!;
        public DateTimeOffset StartUtc { get; init; }
        public DateTimeOffset EndUtc { get; init; }
        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
    }
}
