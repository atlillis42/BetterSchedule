using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Models.Common
{
    /// <summary>
    /// Generic container for paginated query results.
    /// Holds the current page of <typeparamref name="T"/> items and paging metadata.
    /// </summary>
    public class PagedResult<T>
    {
        /// <summary>Items for the current page (never null).</summary>
        public List<T> Items { get; set; } = new List<T>();

        /// <summary>Current page index.</summary>
        public int Page { get; set; }

        /// <summary>Number of items per page.</summary>
        public int PageSize { get; set; }

        /// <summary>Total number of items across all pages.</summary>
        public int TotalCount { get; set; }
    }
}
