using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.Models.DTOs.ProviderAvailability
{
    public class ProviderAvailabilityDto : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
