namespace BetterSchedule.Server.Options
{
    /// <summary>Configuration for demo sandbox creation and cleanup behavior.</summary>
    public sealed class DemoOptions
    {
        /// <summary>OrganizationId for the template organization to clone.</summary>
        public string TemplateOrganizationId { get; set; } = string.Empty;

        /// <summary>Default sandbox lifetime (hours). Recommended: 12.</summary>
        public int DefaultTtlHours { get; set; } = 12;

        /// <summary>Minutes between cleanup scans when using the in-process worker.</summary>
        public int CleanupScanMinutes { get; set; } = 30;
    }
}
