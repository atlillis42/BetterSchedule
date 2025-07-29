using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.DTOs.Reservation
{
    public class CreateReservationDto
    {
        [Required]
        public string ClientId { get; set; }
        [Required]
        public string ServiceProviderId { get; set; }
        [Required]
        public int AppointmentTypeId { get; set; }
        [Required]
        public DateTime StartTime { get; set; }
        [Required]
        public DateTime EndTime { get; set; }


        public string? LocationId { get; set; }
        public int? PackageAssignmentId { get; set; }
        public string? Notes { get; set; }
    }
}
