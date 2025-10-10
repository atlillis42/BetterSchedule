using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Detailed user information including display name, optional username/email, and current roles.
    /// </summary>
    public class UserDto
    {
        /// <summary>Identifier of the user.</summary>
        [Required]
        public string Id { get; init; } = default!;

        /// <summary>Full name of the user, legacy compatibility.</summary>
        [Required]
        public string Name { get; init; } = default!;

        /// <summary>User's First Name, if available.</summary>
        public string? FirstName { get; init; }

        /// <summary>User's Last Name, if available.</summary>
        public string? LastName { get; init; }
        
        /// <summary>Username, if available.</summary>
        public string? UserName { get; init; }

        /// <summary>Email address, if available.</summary>
        public string? Email { get; init; }

        /// <summary>Roles granted to the user.</summary>
        public IEnumerable<string> Roles { get; init; } = Array.Empty<string>();
    }
}
