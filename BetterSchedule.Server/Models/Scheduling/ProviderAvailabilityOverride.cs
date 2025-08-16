public class ProviderAvailabilityOverride
{
    //Not currently implemented, but model is here as reminder of future feature.
    public int Id { get; set; }
    public string OrganizationId { get; set; } = default!;
    public string ServiceProviderId { get; set; } = default!;
    public DateOnly Date { get; set; }           // specific local date
    public TimeSpan? StartLocalTime { get; set; } // null + IsAvailable=false = whole-day off
    public TimeSpan? EndLocalTime { get; set; }
    public bool IsAvailable { get; set; }        // false = blackout; true = extra slot
    public bool IsDeleted { get; set; }
}
