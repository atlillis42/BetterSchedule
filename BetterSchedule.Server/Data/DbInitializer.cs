using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Data;

/// <summary>
/// Seeds demo records so the front‑end has something to render on first run.
/// Call <c>await DbInitializer.SeedAsync(context);</c> from Program.cs right after migrations.
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context, bool reset = false)
    {
        if (reset)
        {
            context.CalendarEvents.RemoveRange(context.CalendarEvents);
            context.CalendarResources.RemoveRange(context.CalendarResources);
            await context.SaveChangesAsync();
        }

        // Only seed if still empty
        if (context.CalendarResources.Any() || context.CalendarEvents.Any())
            return;

        // --- Resources ---
        var arena = new CalendarResource { Name = "Main Arena", BackColor = "#ff7373" };
        var studio2 = new CalendarResource { Name = "Studio 2", BackColor = "#73cfff" };

        context.CalendarResources.AddRange(arena, studio2);

        // --- Events ---
        var yoga = new CalendarEvent
        {
            Title = "Yoga Class",
            StartUtc = DateTime.UtcNow.Date.AddHours(14),
            EndUtc = DateTime.UtcNow.Date.AddHours(15),
            Resource = arena,
            BackColor = "#85d28d"
        };

        context.CalendarEvents.AddRange(
    // Past events (last week)
    new CalendarEvent
    {
        Title = "Past Single-Day Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(-6).AddHours(10),
        EndUtc = DateTime.UtcNow.Date.AddDays(-6).AddHours(12),
        Resource = arena,
        BackColor = "#6ee7b7"
    },
    new CalendarEvent
    {
        Title = "Past Multi-Day Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(-7).AddHours(8),
        EndUtc = DateTime.UtcNow.Date.AddDays(-3).AddHours(18),
        Resource = studio2,
        BackColor = "#a5b4fc"
    },
    // Past event with no resource
    new CalendarEvent
    {
        Title = "Past No-Resource Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(-5).AddHours(9),
        EndUtc = DateTime.UtcNow.Date.AddDays(-5).AddHours(11),
        Resource = null,
        BackColor = "#fde68a"
    },

    // Current week
    new CalendarEvent
    {
        Title = "Today Event",
        StartUtc = DateTime.UtcNow.Date.AddHours(13),
        EndUtc = DateTime.UtcNow.Date.AddHours(15),
        Resource = arena,
        BackColor = "#fca5a5"
    },
    new CalendarEvent
    {
        Title = "This Week (Spans Days)",
        StartUtc = DateTime.UtcNow.Date.AddDays(2).AddHours(9),
        EndUtc = DateTime.UtcNow.Date.AddDays(5).AddHours(17),
        Resource = studio2,
        BackColor = "#fdba74"
    },
    // Today, no resource, different hours
    new CalendarEvent
    {
        Title = "Today No-Resource (Early Morning)",
        StartUtc = DateTime.UtcNow.Date.AddHours(6),
        EndUtc = DateTime.UtcNow.Date.AddHours(8),
        Resource = null,
        BackColor = "#a7f3d0"
    },

    // Future events
    new CalendarEvent
    {
        Title = "Future Single-Day Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(10).AddHours(9),
        EndUtc = DateTime.UtcNow.Date.AddDays(10).AddHours(11),
        Resource = arena,
        BackColor = "#818cf8"
    },
    new CalendarEvent
    {
        Title = "Future Multi-Day Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(15).AddHours(8),
        EndUtc = DateTime.UtcNow.Date.AddDays(22).AddHours(18),
        Resource = studio2,
        BackColor = "#fbbf24"
    },
    // Future event, no resource
    new CalendarEvent
    {
        Title = "Future No-Resource Event",
        StartUtc = DateTime.UtcNow.Date.AddDays(14).AddHours(14),
        EndUtc = DateTime.UtcNow.Date.AddDays(14).AddHours(15),
        Resource = null,
        BackColor = "#e0e7ff"
    }
);

        context.CalendarEvents.Add(yoga);

        await context.SaveChangesAsync();
    }
}
