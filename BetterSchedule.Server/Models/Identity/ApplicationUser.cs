using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Identity
{
    /// <summary>
    /// Application user extending <see cref="IdentityUser"/>.
    /// Supports a primary <see cref="Organization"/> and soft delete.
    /// Clients may also belong to additional organizations via <see cref="ClientOrganization"/>.
    /// For service providers, <see cref="AvailabilityPublic"/> controls whether clients may view this provider’s availability.
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        /// <summary>
        /// Full name for display in the UI.
        /// </summary>
        public string? FullName { get; set; }

        /// <summary>Given/first name.</summary>
        [MaxLength(100)]
        public string? FirstName { get; set; }

        /// <summary>Family/last name.</summary>
        [MaxLength(100)]
        public string? LastName { get; set; }

        /// <summary>
        /// Soft delete flag; hidden from normal queries and sign-in when <c>true</c>.
        /// </summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Identifier of the user’s primary organization, if set.
        /// </summary>
        public string? OrganizationId { get; set; }

        /// <summary>
        /// Navigation to the user’s primary organization, if set.
        /// </summary>
        public Organization? Organization { get; set; }

        /// <summary>
        /// When <c>true</c> and the user has the ServiceProvider role,
        /// clients may view this provider’s availability.
        /// </summary>
        public bool AvailabilityPublic { get; set; } = false;
    }
}
