using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Scheduling;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    public class Organization
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required, MaxLength(128)]
        public string Name { get; set; }

        public string? OwnerUserId { get; set; }


        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }

        public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();
        public ICollection<AppointmentType> AppointmentTypes { get; set; } = new List<AppointmentType>();
    }
}
