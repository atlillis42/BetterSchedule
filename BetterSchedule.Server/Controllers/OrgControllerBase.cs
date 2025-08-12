using BetterSchedule.Server.Auth;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Controllers
{
    [ApiController]
    public abstract class OrgControllerBase : ControllerBase
    {
        // Quick access to claims and roles
        protected string OrganizationId => User.GetOrgIdOrThrow();
        protected string? UserId => User.GetUserId();

        protected bool IsManager => User.IsInRole("Manager");
        protected bool IsProvider => User.IsInRole("ServiceProvider");
        protected bool IsClient => User.IsInRole("Client");
    }
}