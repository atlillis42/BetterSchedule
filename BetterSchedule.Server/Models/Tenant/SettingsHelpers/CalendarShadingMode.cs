namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>Background shading modes in the calendar UI.</summary>
    public enum CalendarShadingMode
    {
        /// <summary>No shading.</summary>
        None = 0,

        /// <summary>Shade outside organization business hours.</summary>
        OrgBusinessHours = 1,

        /// <summary>Shade outside the selected provider’s availability windows.</summary>
        ProviderAvailability = 2
    }
}
