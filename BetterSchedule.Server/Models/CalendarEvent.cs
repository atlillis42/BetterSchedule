namespace BetterSchedule.Server.Models
{
    public class CalendarEvent
    {
        public int Id { get; set; }
        public string Title { get; set; } = default!;
        public DateTime StartUtc { get; set; }
        public DateTime EndUtc { get; set; }
        public int? ResourceId { get; set; }
        public string BackColorHex { get; set; } = "#a3a87ad";

        public CalendarResource? Resource { get; set; }
    }
}
