using System.Diagnostics;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Extensions
{
    public sealed class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        public RequestLoggingMiddleware(RequestDelegate next) => _next = next;

        public async Task Invoke(HttpContext context, ILogger<RequestLoggingMiddleware> logger)
        {
            var sw = Stopwatch.StartNew();
            var method = context.Request.Method;
            var path = context.Request.Path.Value ?? "/";

            await _next(context);

            sw.Stop();
            logger.LogInformation("HTTP {Method} {Path} -> {StatusCode} in {Elapsed} ms",
                method, path, context.Response.StatusCode, sw.ElapsedMilliseconds);
        }
    }
}
