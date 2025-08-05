using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Common
{
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new List<T>(); // never null
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
    }
}
