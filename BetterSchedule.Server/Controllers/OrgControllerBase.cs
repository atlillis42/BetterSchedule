using BetterSchedule.Server.Auth;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Controllers
{
    /// <summary>
    /// Base controller that exposes convenience accessors for organization- and role-based claims.
    /// </summary>
    [ApiController]
    public abstract class OrgControllerBase : ControllerBase
    {
        /// <summary>
        /// Gets the organization identifier from the current user's claims.
        /// </summary>
        protected string OrganizationId => User.GetOrgIdOrThrow();

        /// <summary>
        /// Gets the current user's identifier from the claims, if available.
        /// </summary>
        protected string? UserId => User.GetUserId();

        /// <summary>
        /// Determines whether the current user has the Manager role.
        /// </summary>
        protected bool IsManager => User.IsInRole("Manager");

        /// <summary>
        /// Determines whether the current user has the ServiceProvider role.
        /// </summary>
        protected bool IsProvider => User.IsInRole("ServiceProvider");

        /// <summary>
        /// Determines whether the current user has the Client role.
        /// </summary>
        protected bool IsClient => User.IsInRole("Client");
    }
}