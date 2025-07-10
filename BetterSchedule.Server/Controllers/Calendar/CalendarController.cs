using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public CalendarController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Resources

    /// <summary>
    /// Returns all calendar resources (e.g., rooms, providers).
    /// </summary>
    /// <remarks>
    /// Later we will filter by role – e.g., ServiceProvider only sees their own resources.
    /// </remarks>
    [HttpGet("resources")]
    [ProducesResponseType(typeof(IEnumerable<CalendarResourceDto>), 200)]
    public async Task<IActionResult> GetResourcesAsync()
    {
        var resources = await _dbContext.CalendarResources
            .AsNoTracking()
            .Select(r => new CalendarResourceDto
            {
                Id = r.Id,
                Name = r.Name,
                BackColor = r.BackColor
            })
            .ToListAsync();

        return Ok(resources);
    }

    #endregion

    #region Events

    /// <summary>
    /// Fetch calendar events in the requested date window.
    /// </summary>
    /// <param name="start">ISO date – inclusive start of range (UTC).</param>
    /// <param name="end">ISO date – exclusive end of range (UTC).</param>
    [HttpGet("events")]
    [ProducesResponseType(typeof(IEnumerable<CalendarEventDto>), 200)]
    public async Task<IActionResult> GetEventsAsync([FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        // Ensure the query parameters are treated as UTC to match stored values
        var startUtc = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(end, DateTimeKind.Utc);

        if (endUtc <= startUtc)
        {
            return BadRequest("End must be after start.");
        }

        var events = await _dbContext.CalendarEvents
            .AsNoTracking()
            .Where(e => e.StartUtc < endUtc && e.EndUtc > startUtc) // overlaps window
            .Select(e => new CalendarEventDto
            {
                Id = e.Id,
                Text = e.Title,
                StartUtc = e.StartUtc,
                EndUtc = e.EndUtc,
                ResourceId = e.ResourceId,
                BackColor = e.BackColor
            })
            .ToListAsync();

        var probe = await _dbContext.CalendarEvents
    .OrderBy(e => e.StartUtc)
    .Select(e => new { e.Id, e.Title, e.StartUtc, e.EndUtc })
    .ToListAsync();

        return Ok(events);
    }

    /// <summary>
    /// Create a new calendar event.
    /// </summary>
    [HttpPost("events")]
    [ProducesResponseType(typeof(CalendarEventDto), 201)]
    public async Task<IActionResult> CreateEventAsync([FromBody] CalendarEventCreateDto payload)
    {
        var entity = new CalendarEvent
        {
            Title = payload.Text,
            StartUtc = payload.StartUtc,
            EndUtc = payload.EndUtc,
            ResourceId = payload.ResourceId,
            BackColor = payload.BackColor ?? "#3a87ad" // default DayPilot blue
        };

        _dbContext.CalendarEvents.Add(entity);
        await _dbContext.SaveChangesAsync();

        var dto = new CalendarEventDto
        {
            Id = entity.Id,
            Text = entity.Title,
            StartUtc = entity.StartUtc,
            EndUtc = entity.EndUtc,
            ResourceId = entity.ResourceId,
            BackColor = entity.BackColor
        };

        return CreatedAtAction(nameof(GetEventsAsync), new { start = entity.StartUtc, end = entity.EndUtc }, dto);
    }

    /// <summary>
    /// Update an existing event.
    /// </summary>
    [HttpPut("events/{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateEventAsync(int id, [FromBody] CalendarEventUpdateDto payload)
    {
        var entity = await _dbContext.CalendarEvents.FindAsync(id);
        if (entity is null) return NotFound();

        entity.Title = payload.Text;
        entity.StartUtc = payload.StartUtc;
        entity.EndUtc = payload.EndUtc;
        entity.ResourceId = payload.ResourceId;
        entity.BackColor = payload.BackColor;

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Delete an event by id.
    /// </summary>
    [HttpDelete("events/{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteEventAsync(int id)
    {
        var entity = await _dbContext.CalendarEvents.FindAsync(id);
        if (entity is null) return NotFound();

        _dbContext.CalendarEvents.Remove(entity);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    #endregion
}
