// Production-leaning setup with Azure App Service + Azure SQL (Managed Identity).

using System.Globalization;
using System.Reflection;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Extensions;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Options;
using BetterSchedule.Server.Services.Demo;
using BetterSchedule.Server.Services.Scheduling;
using BetterSchedule.Server.Services.Time;
using BetterSchedule.Server.Startup;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------
// Controllers / JSON
// -----------------------------
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Include XML docs if available (kept in prod; low-cost, useful for ops).
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
});

// -----------------------------
// Core service registrations
// -----------------------------
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection("Features"));

builder.Services.Configure<DemoOptions>(builder.Configuration.GetSection("Demo"));
builder.Services.AddScoped<ISandboxService, SandboxService>();
builder.Services.AddScoped<IDemoSandboxSeeder, DemoSandboxSeeder>();
builder.Services.AddScoped<DemoSandboxSeeder>();
builder.Services.AddMemoryCache();

// Rate-limit options (bound from config, with sane defaults)
builder.Services.Configure<DemoRateLimitOptions>(builder.Configuration.GetSection("Demo:RateLimit"));
builder.Services.Configure<AuthRateLimitOptions>(builder.Configuration.GetSection("Auth:RateLimit"));
var demoRate = builder.Configuration.GetSection("Demo:RateLimit").Get<DemoRateLimitOptions>() ?? new DemoRateLimitOptions();
var authRate = builder.Configuration.GetSection("Auth:RateLimit").Get<AuthRateLimitOptions>() ?? new AuthRateLimitOptions();
var demoWindow = TimeSpan.FromSeconds(Math.Max(1, demoRate.WindowSeconds));
var demoStartLimit = Math.Max(1, demoRate.MaxStartsPerIp);
var authWindow = TimeSpan.FromSeconds(Math.Max(1, authRate.WindowSeconds));
var authLimit = Math.Max(1, authRate.MaxRequestsPerIp);

// -----------------------------
// HTTPS / HSTS
// -----------------------------
builder.Services.AddHsts(o =>
{
    o.Preload = false;            // avoid surprising subdomain behavior
    o.IncludeSubDomains = false;  // keep scope tight; add if/when needed
    o.MaxAge = TimeSpan.FromDays(180);
});
builder.Services.AddHttpsRedirection(o =>
{
    // TLS is terminated by Azure FrontEnd; we still enforce redirect semantics.
    o.RedirectStatusCode = StatusCodes.Status308PermanentRedirect;
    o.HttpsPort = 443;
});

// -----------------------------
// Forwarded headers (required behind Azure’s proxy)
// -----------------------------
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost |
        ForwardedHeaders.XForwardedFor;

    // Trust App Service front-ends (dynamic); don’t pin to specific IPs.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = null;
});

// -----------------------------
// Built-in Rate Limiting (small per-IP guards; adjust per traffic)
// -----------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
    {
        int retryAfterSeconds = 0;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
        {
            retryAfterSeconds = (int)Math.Ceiling(Math.Max(0, retryAfter.TotalSeconds));
            context.HttpContext.Response.Headers["Retry-After"] = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);
        }

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new { error = "rate_limited", retryAfterSeconds }, cancellationToken: token);
    };

    options.AddPolicy("DemoStartPolicy", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"demo-start:ip:{ip}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = demoStartLimit,
                Window = demoWindow,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });

    options.AddPolicy("DemoResetPolicy", httpContext =>
    {
        var orgId = httpContext.User.FindFirst("org_id")?.Value ?? "anon";
        var userId = httpContext.User.Identity?.IsAuthenticated == true
            ? (httpContext.User.FindFirst("sub")?.Value ?? "anon")
            : "anon";

        return RateLimitPartition.GetFixedWindowLimiter(
            $"demo-reset:org:{orgId}:user:{userId}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = demoStartLimit,
                Window = demoWindow,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });

    options.AddPolicy("AuthPolicy", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"auth:ip:{ip}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authLimit,
                Window = authWindow,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });
});

// -----------------------------
// Authentication / Authorization
// -----------------------------
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = IdentityConstants.ApplicationScheme;
    options.DefaultAuthenticateScheme = IdentityConstants.ApplicationScheme;
    options.DefaultSignInScheme = IdentityConstants.ApplicationScheme;
    options.DefaultChallengeScheme = IdentityConstants.ApplicationScheme;
})
.AddCookie(IdentityConstants.ApplicationScheme, options =>
{
    // Cookies are used for browser flows; keep Secure + HttpOnly in prod.
    options.SlidingExpiration = true;
    options.LoginPath = "/api/login";
    options.Cookie.Name = ".BetterSchedule.Identity";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;

    // API endpoints should return 401/403, not HTML redirects.
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        },
        OnRedirectToAccessDenied = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        }
    };
});

builder.Services
    .AddIdentityCore<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddSignInManager()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, CustomClaimsPrincipalFactory>();
builder.Services.AddScoped<ISchedulingConflictService, SchedulingConflictService>();

// -----------------------------
// Feature flags for DB-dependent background work
// (Default to ON in dev, OFF in prod unless explicitly enabled.)
// -----------------------------
var enableDemoCleanup = builder.Configuration.GetValue<bool>("Features:EnableDemoCleanup", builder.Environment.IsDevelopment());
var ensureCoreRolesOnStartup = builder.Configuration.GetValue<bool>("Features:EnsureCoreRolesOnStartup", builder.Environment.IsDevelopment());

if (enableDemoCleanup)
    builder.Services.AddHostedService<DemoCleanupWorker>();

if (ensureCoreRolesOnStartup)
    builder.Services.AddHostedService<EnsureCoreRolesHostedService>();

// -----------------------------
// CORS
// For a single-origin deploy (SPA + API in the same App Service), CORS is a no-op.
// If you split front/back later, set App:ClientUrl to the SPA origin.
// -----------------------------
builder.Services.AddCors(options =>
{
    var clientUrl = builder.Configuration["App:ClientUrl"] ?? "http://localhost:5173";
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(clientUrl).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// -----------------------------
// EF Core + Azure SQL (Managed Identity) hardening
// - Pooling reduces per-request overhead
// - Longer timeouts tolerate serverless warm-up
// - Retries smooth over transient faults
// - MARS reduces contention on pooled connections
// -----------------------------
builder.Services.AddDbContextPool<ApplicationDbContext>(options =>
{
    var raw = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
    var csb = new SqlConnectionStringBuilder(raw);

    if (csb.ConnectTimeout < 60) csb.ConnectTimeout = 60; // post-login can exceed 15s on cold DB
    csb.MultipleActiveResultSets = true;
    if (string.IsNullOrWhiteSpace(csb.ApplicationName)) csb.ApplicationName = "BetterSchedule.Server";

    options.UseSqlServer(
        csb.ConnectionString,
        sql =>
        {
            sql.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
            sql.CommandTimeout(60); // first heavy query after cold start
        });
});

var app = builder.Build();

// -----------------------------
// One-time prod migrations gate
// Toggle via app setting: Data__RunMigrationsOnStartup = true
// Keep OFF normally to avoid startup latency.
// -----------------------------
if (!app.Environment.IsDevelopment() &&
    app.Configuration.GetValue<bool>("Data:RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
    app.Logger.LogInformation("Applied EF Core migrations at startup (Production).");
}

// Useful operational visibility
app.Logger.LogInformation(
    "RateLimits → Demo: window={DemoWindow}s, startLimit={DemoLimit}; Auth: window={AuthWindow}s, authLimit={AuthLimit}",
    demoRate.WindowSeconds, demoStartLimit, authRate.WindowSeconds, authLimit);

// -----------------------------
// Dev-only helpers
// -----------------------------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    app.ApplyMigrations(); // optional dev helper

    app.UseSwagger();
    app.UseSwaggerUI();
}

// -----------------------------
// HTTP pipeline (order matters)
// -----------------------------
app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

// -----------------------------
// Health check
// - Uses EF execution strategy to absorb transient SQL faults
// - Returns 503 only when DB is not reachable after retry
// Keep the body terse in prod; verbose errors invite information leaks.
// -----------------------------
app.MapGet("/healthz", async (ApplicationDbContext db) =>
{
    try
    {
        var strategy = db.Database.CreateExecutionStrategy();
        var ok = await strategy.ExecuteAsync(async () => await db.Database.CanConnectAsync());
        return ok
            ? Results.Ok(new { status = "Healthy" })
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
}).AllowAnonymous();

app.MapControllers();

// SPA fallback (only relevant when you deploy the Vite build into wwwroot)
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    /// <summary>
    /// Program entry point type for test hosting and integration frameworks.
    /// </summary>
    public partial class Program { }
}
