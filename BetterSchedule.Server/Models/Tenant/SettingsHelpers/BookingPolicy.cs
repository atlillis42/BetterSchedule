using System;

namespace BetterSchedule.Server.Models.Tenant.SettingsHelpers
{
    /// <summary>
    /// Centralized helpers for evaluating org booking/cancellation policies.
    /// Keep controller code lean and make future changes safer.
    /// </summary>
    public static class BookingPolicy
    {
        /// <summary>
        /// Returns true if a client is allowed to cancel given org policies and timing.
        /// Enforces the rule: if providers cannot cancel, clients cannot cancel either.
        /// </summary>
        public static bool CanClientCancel(
            ClientCancelPolicy clientPolicy,
            ProviderCancelPolicy providerPolicy,
            TimeSpan cancelWindow,
            DateTimeOffset now,
            DateTimeOffset start)
        {
            // Provider gate: if providers are completely disallowed, clients are too
            if (providerPolicy == ProviderCancelPolicy.None)
                return false;

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
        /// Returns true if a provider is allowed to cancel given org policy and timing.
        /// (Manager overrides are handled in controller logic; this is the base policy.)
        /// </summary>
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

        /// <summary>
        /// Returns true if the target start violates the minimum lead time (i.e., is too soon).
        /// </summary>
        public static bool ViolatesLeadTime(int minLeadMinutes, DateTimeOffset now, DateTimeOffset start)
            => start < now.AddMinutes(minLeadMinutes);
    }
}
