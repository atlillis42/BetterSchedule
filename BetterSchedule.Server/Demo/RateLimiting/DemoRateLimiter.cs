using System;
using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using BetterSchedule.Server.Options;

namespace BetterSchedule.Server.Services.Demo
{
    public sealed class DemoRateLimiter : IDemoRateLimiter
    {
        private sealed class Counter { public int Count; public DateTimeOffset WindowStart; }

        private readonly IMemoryCache _cache;
        private readonly DemoRateLimitOptions _opt;
        private readonly ConcurrentDictionary<string, object> _locks = new();

        public DemoRateLimiter(IMemoryCache cache, IOptions<DemoRateLimitOptions> opt)
        {
            _cache = cache;
            _opt = opt.Value;
        }

        public bool TryConsume(string key, out TimeSpan retryAfter)
        {
            var now = DateTimeOffset.UtcNow;
            var window = TimeSpan.FromSeconds(Math.Max(1, _opt.WindowSeconds));

            var entry = _cache.GetOrCreate(key, e =>
            {
                e.AbsoluteExpirationRelativeToNow = window;
                return new Counter { Count = 0, WindowStart = now };
            });

            var gate = _locks.GetOrAdd(key, _ => new object());
            lock (gate)
            {
                // Rotate window if expired
                if (entry.WindowStart + window <= now)
                {
                    entry.Count = 0;
                    entry.WindowStart = now;
                }

                if (entry.Count >= _opt.MaxStartsPerIp)
                {
                    retryAfter = (entry.WindowStart + window) - now;
                    return false;
                }

                entry.Count++;
                var ttl = (entry.WindowStart + window) - now;
                _cache.Set(key, entry, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
                retryAfter = TimeSpan.Zero;
                return true;
            }
        }
    }
}
