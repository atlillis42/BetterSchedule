namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>Policy controlling whether providers may cancel their own reservations.</summary>
    public enum ProviderCancelPolicy
    {
        /// <summary>Providers cannot cancel; only managers may cancel.</summary>
        None = 0,

        /// <summary>Providers may cancel only outside the cancel window; inside the window requires a manager.</summary>
        RespectWindow = 1,

        /// <summary>Providers may cancel at any time.</summary>
        AnyTime = 2
    }
}
