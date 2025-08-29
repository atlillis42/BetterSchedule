using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    /// <summary>
    /// Tenant/organization entity used for multi-tenant scoping and ownership of users and catalog data.
    /// Stores basic contact info and legacy booking policy durations (see <see cref="OrganizationSettings"/> for current policy).
    /// </summary>
    public class Organization
    {
        /// <summary>Unique identifier for the organization.</summary>
        [Key] public string Id { get; set; } = Guid.NewGuid().ToString();

        /// <summary>Display name of the organization.</summary>
        [Required, MaxLength(128)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Identifier of the owner user, if designated.</summary>
        public string? OwnerUserId { get; set; }

        /// <summary>Organization contact email address.</summary>
        public string? Email { get; set; }

        /// <summary>Organization contact phone number.</summary>
        public string? Phone { get; set; }

        /// <summary>Organization mailing or street address.</summary>
        public string? Address { get; set; }

        /// <summary>Users belonging to this organization.</summary>
        public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();

        /// <summary>Appointment types owned by this organization.</summary>
        public ICollection<AppointmentType> AppointmentTypes { get; set; } = new List<AppointmentType>();
    }
}
