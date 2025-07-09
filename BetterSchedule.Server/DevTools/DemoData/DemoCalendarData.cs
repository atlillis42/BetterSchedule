namespace BetterSchedule.Server.DevTools.DemoData
{
    public static class DemoCalendarData
    {
        public static IReadOnlyList<CalendarResource> Resources { get; } =
        [
            new("R1", "Main Arena"),
        new("R2", "Secondary Arena"),
        new("R3", "Training Room"),
        new("R4", "Conference Room"),
        new("R5", "VIP Lounge")
        ];

        public static IReadOnlyList<CalendarEvent> Events { get; } =
        [
            new(1, "Event 1", DateTime.Today.AddHours(9),  DateTime.Today.AddHours(11), "R1"),
        new(2, "Event 2", DateTime.Today.AddHours(10), DateTime.Today.AddHours(12), "R2"),
        new(3, "Event 3", DateTime.Today.AddDays(1).AddHours(9),  DateTime.Today.AddDays(1).AddHours(11), "R3"),
        new(4, "Event 4", DateTime.Today.AddDays(1).AddHours(11.5),DateTime.Today.AddDays(1).AddHours(13.5), "R4"),
        new(5, "Event 5", DateTime.Today.AddDays(4).AddHours(9),  DateTime.Today.AddDays(4).AddHours(11), "R5"),
        new(6, "Event 6", DateTime.Today.AddDays(4).AddHours(13), DateTime.Today.AddDays(4).AddHours(15), "R1"),
    ];
    }

    public record CalendarResource(string Id, string Name);

    public record CalendarEvent(
        int Id,
        string Text,
        DateTime Start,
        DateTime End,
        string ResourceId);
}
