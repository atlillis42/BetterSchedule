namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>Policy controlling whether clients may cancel their own reservations.</summary>
    public enum ClientCancelPolicy
    {
        /// <summary>Clients cannot cancel; only staff may cancel.</summary>
        None = 0,

        /// <summary>Clients may cancel only outside the cancel window.</summary>
        RespectWindow = 1,

        /// <summary>Clients may cancel at any time (still subject to provider policy gates).</summary>
        AnyTime = 2
    }
}
