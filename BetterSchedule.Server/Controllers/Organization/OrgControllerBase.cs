using BetterSchedule.Server.Auth;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Controllers.Organization
{
    /// <summary>
    /// Base controller exposing convenience accessors for organization- and role-based claims.
    /// </summary>
    [ApiController]
    public abstract class OrgControllerBase : ControllerBase
    {
        /// <summary>Organization identifier from the current user's claims.</summary>
        protected string OrganizationId => User.GetOrgIdOrThrow();

        /// <summary>Current user's identifier (or <c>null</c> if unavailable).</summary>
        protected string? UserId => User.GetUserId();

        /// <summary>Current user's identifier (null not allowed).</summary>
        protected string UserIdOrThrow => User.GetUserIdOrThrow();

        /// <summary>Whether the current user has the Manager role.</summary>
        protected bool IsManager => User.IsInRole("Manager");

        /// <summary>Whether the current user has the ServiceProvider role.</summary>
        protected bool IsProvider => User.IsInRole("ServiceProvider");

        /// <summary>Whether the current user has the Client role.</summary>
        protected bool IsClient => User.IsInRole("Client");
    }
}
