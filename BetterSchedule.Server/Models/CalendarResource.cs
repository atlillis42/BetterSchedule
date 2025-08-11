using BetterSchedule.Server.Models.Tenant;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace BetterSchedule.Server.Models
{
    public class CalendarResource
    {
        public int Id { get; set; } = default!;

        [Required]
        public string Name { get; set; } = default!;

        public string? BackColor { get; set; } = "#d0d0d0";

        [Required]
        public string OrganizationId { get; set; }
        public Organization Organization { get; set; }

        public ICollection<BlockedTime> BlockedTimes { get; set; } = new List<BlockedTime>();
    }
}
