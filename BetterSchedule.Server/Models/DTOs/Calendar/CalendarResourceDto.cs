namespace BetterSchedule.Server.Models.DTOs.Calendar
{
    public sealed record CalendarResourceDto
    {
        public int Id { get; init; }
        public string Name { get; init; } = default!;
        public string? BackColor { get; init; } = default!;
    }
}
