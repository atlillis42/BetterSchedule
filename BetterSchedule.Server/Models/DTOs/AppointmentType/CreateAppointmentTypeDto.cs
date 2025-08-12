using System;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.AppointmentType
{
    public class CreateAppointmentTypeDto
    {
        [Required]
        public string Name { get; init; } = string.Empty;

        [Required]
        public TimeSpan Duration { get; init; }

        public decimal Price { get; init; } = 0;
        public string? Description { get; init; }

        [Required]
        public string CreatedByUserId { get; init; } = default!;

        public int? AssignedLocationId { get; init; }
        public bool IsPublic { get; init; }
        public bool RequiresWaiver { get; init; }
    }
}
