namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>
    /// Policy controlling whether providers may cancel their own reservations.
    /// Note: As of the late-cancel redesign, controllers treat this as advisory/analytic;
    /// Managers/Providers can cancel; late classification is derived from CancelWindowHours.
    /// </summary>
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
