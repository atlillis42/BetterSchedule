namespace BetterSchedule.Server.Models
{
    public class CalendarEvent
    {
        public int Id { get; set; }
        public string Title { get; set; } = default!;
        public DateTimeOffset StartUtc { get; set; }
        public DateTimeOffset EndUtc { get; set; }
        public int? ResourceId { get; set; }
        public string? BackColor { get; set; } = "#a3a87ad";

        public CalendarResource? Resource { get; set; }
    }
}
