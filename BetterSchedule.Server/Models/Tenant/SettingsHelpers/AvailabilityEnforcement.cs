namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>Server-side enforcement levels for provider availability checks.</summary>
    public enum AvailabilityEnforcement
    {
        /// <summary>No availability checks.</summary>
        None = 0,

        /// <summary>Allow but return a warning/flag.</summary>
        Warn = 1,

        /// <summary>Providers are blocked; managers may proceed with a warning or explicit override.</summary>
        BlockProvidersWarnManagers = 2,

        /// <summary>Both providers and managers require an explicit override to proceed.</summary>
        BlockAllRequireOverride = 3
    }
}
