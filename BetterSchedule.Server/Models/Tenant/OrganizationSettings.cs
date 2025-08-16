using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Tenant
{
    public class OrganizationSettings
    {
        [Key]
        public string OrganizationId { get; set; } = default!;

        public int MinLeadMinutes { get; set; } = 0;
        public int CancelWindowHours { get; set; } = 0;

        public Organization Organization { get; set; } = default!;
    }
}