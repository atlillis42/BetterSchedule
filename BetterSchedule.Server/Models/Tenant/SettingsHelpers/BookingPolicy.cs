using System;

namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>
    /// Centralized helpers for evaluating org booking/cancellation policies.
    /// Controllers now prefer "late cancel classification" over hard blocks for clients.
    /// </summary>
    public static class BookingPolicy
    {
        /// <summary>
        /// Returns true if the target start violates the minimum lead time (i.e., is too soon).
        /// </summary>
        public static bool ViolatesLeadTime(int minLeadMinutes, DateTimeOffset now, DateTimeOffset start)
            => start < now.AddMinutes(minLeadMinutes);

        /// <summary>
        /// Compute whether a cancellation is "late" using org-local time and the cancel window hours.
        /// </summary>
        public static bool IsLateCancel(
            DateTimeOffset nowUtc,
            DateTimeOffset startUtc,
            string orgTimeZoneId,
            int cancelWindowHours)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(orgTimeZoneId);
            var startLocal = TimeZoneInfo.ConvertTime(startUtc, tz);
            var nowLocal = TimeZoneInfo.ConvertTime(nowUtc, tz);

            // Cutoff is (start - window). If nowLocal is after cutoff => late.
            var cutoffLocal = startLocal.AddHours(-cancelWindowHours);
            return nowLocal > cutoffLocal;
        }
    }
}