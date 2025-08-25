using BetterSchedule.Server.Extensions;

namespace BetterSchedule.Server.Extensions
{
    public static class RequestPipelineExtensions
    {
        /// <summary>
        /// Development diagnostics: correlation id + concise request logging.
        /// </summary>
        public static IApplicationBuilder UseDevDiagnostics(this IApplicationBuilder app)
        {
            app.UseMiddleware<CorrelationIdMiddleware>();
            app.UseMiddleware<RequestLoggingMiddleware>();
            return app;
        }
    }
}
