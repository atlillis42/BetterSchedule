namespace BetterSchedule.Server.Models.DTOs
{
    public record CalendarEventCreateDto
    {
        public string Text { get; init; } = default!;
        public DateTime StartUtc { get; init; }
        public DateTime EndUtc { get; init; }
        public int? ResourceId { get; init; }
        public string? BackColor { get; init; }
    }
}
