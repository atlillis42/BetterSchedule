using System.Threading.Tasks;

namespace BetterSchedule.Server.Extensions
{
    public sealed class CorrelationIdMiddleware
    {
        private readonly RequestDelegate _next;
        private const string HeaderName = "X-Correlation-Id";

        public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

        public async Task Invoke(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
        {
            var cid = context.Request.Headers.TryGetValue(HeaderName, out var values) && values.Count > 0
                ? values[0]
                : Guid.NewGuid().ToString("n");

            context.Response.Headers[HeaderName] = cid;

            using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = cid }))
            {
                await _next(context);
            }
        }
    }
}
