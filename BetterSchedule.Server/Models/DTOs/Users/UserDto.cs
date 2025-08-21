using System;
using System.Collections.Generic;

namespace BetterSchedule.Server.Models.DTOs.Users
{
    /// <summary>
    /// Detailed user information including current roles.
    /// </summary>
    public class UserDto
    {
        public string Id { get; init; } = default!;
        public string Name { get; init; } = default!;
        public string? UserName { get; init; }
        public string? Email { get; init; }
        public IEnumerable<string> Roles { get; init; } = Array.Empty<string>();
    }
}