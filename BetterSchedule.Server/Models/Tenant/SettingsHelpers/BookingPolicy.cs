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
        /// Compute whether a cancellation is "late" using org-local time, cancel window hours, and optional grace minutes.
        /// </summary>
        public static bool IsLateCancel(
            DateTimeOffset nowUtc,
            DateTimeOffset startUtc,
            string orgTimeZoneId,
            int cancelWindowHours,
            int graceMinutes = 0)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(orgTimeZoneId);
            var startLocal = TimeZoneInfo.ConvertTime(startUtc, tz);
            var nowLocal = TimeZoneInfo.ConvertTime(nowUtc, tz);
            // Cutoff is (start - window + grace). If nowLocal is after cutoff => late.
            var cutoffLocal = startLocal.AddHours(-cancelWindowHours).AddMinutes(graceMinutes);
            return nowLocal > cutoffLocal;
        }

        // ----------------------------
        // Legacy helpers (kept for compatibility; not used for gating clients anymore)
        // ----------------------------

        /// <summary>
        /// Legacy: Returns true if a client is allowed to cancel under old gating rules.
        /// New flow: Controllers allow client cancel (pre-start) and classify late via IsLateCancel.
        /// </summary>
        [Obsolete("Use IsLateCancel classification + controller-side gating (pre-start only).")]
        public static bool CanClientCancel(
            ClientCancelPolicy clientPolicy,
            ProviderCancelPolicy providerPolicy,
            TimeSpan cancelWindow,
            DateTimeOffset now,
            DateTimeOffset start)
        {
            if (providerPolicy == ProviderCancelPolicy.None) return false;
            var timeRemaining = start - now;

            return clientPolicy switch
            {
                ClientCancelPolicy.None => false,
                ClientCancelPolicy.RespectWindow => timeRemaining >= cancelWindow,
                ClientCancelPolicy.AnyTime => true,
                _ => false
            };
        }

        /// <summary>
        /// Legacy: Returns true if a provider is allowed to cancel under old gating rules.
        /// Managers/providers now cancel freely; late status is computed separately.
        /// </summary>
        [Obsolete("Managers/providers can cancel; use IsLateCancel classification only.")]
        public static bool CanProviderCancel(
            ProviderCancelPolicy providerPolicy,
            TimeSpan cancelWindow,
            DateTimeOffset now,
            DateTimeOffset start)
        {
            var timeRemaining = start - now;

            return providerPolicy switch
            {
                ProviderCancelPolicy.None => false,
                ProviderCancelPolicy.RespectWindow => timeRemaining >= cancelWindow,
                ProviderCancelPolicy.AnyTime => true,
                _ => false
            };
        }
    }
}
