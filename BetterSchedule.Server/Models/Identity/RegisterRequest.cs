using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Auth
{
    /// <summary>
    /// Request payload for registering a new user account.
    /// </summary>
    public sealed class RegisterRequest
    {
        /// <summary>User email address (also used as username).</summary>
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; init; } = string.Empty;

        /// <summary>Plaintext password (validated by ASP.NET Identity password policy).</summary>
        [Required, MinLength(8)]
        public string Password { get; init; } = string.Empty;

        /// <summary>Given/first name.</summary>
        public string FirstName { get; init; } = string.Empty;

        /// <summary>Family/last name.</summary>
        public string LastName { get; init; } = string.Empty;
        /// <summary>First and Last name, ensures legacy compatibility.</summary>
        public string? FullName { get; init; }
    }
}