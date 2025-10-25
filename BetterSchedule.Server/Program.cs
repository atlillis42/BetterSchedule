// Production-leaning setup with Azure App Service + Azure SQL (Managed Identity).
// Demo features are gated by flags so prod stays clean/off by default.

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
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

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
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
});

// -----------------------------
// Core services + options
// -----------------------------
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection("Features"));
builder.Services.Configure<DemoOptions>(builder.Configuration.GetSection("Demo"));
builder.Services.AddScoped<ISandboxService, SandboxService>();
builder.Services.AddScoped<IDemoSandboxSeeder, DemoSandboxSeeder>();
builder.Services.AddScoped<DemoSandboxSeeder>();
builder.Services.AddMemoryCache();

// Rate-limit options (from config or sane defaults)
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
    o.Preload = false;
    o.IncludeSubDomains = false;
    o.MaxAge = TimeSpan.FromDays(180);
});
builder.Services.AddHttpsRedirection(o =>
{
    o.RedirectStatusCode = StatusCodes.Status308PermanentRedirect;
    o.HttpsPort = 443;
});

// -----------------------------
// Forwarded headers (Azure front-ends)
// -----------------------------
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost |
        ForwardedHeaders.XForwardedFor;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = null;
});

// -----------------------------
// Rate Limiting
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
    options.SlidingExpiration = true;
    options.LoginPath = "/api/login";
    options.Cookie.Name = ".BetterSchedule.Identity";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;

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
// Feature flags for Demo features (long-term plan)
// - Features:EnableDemoApis           → controls /api/demo/* endpoints (OFF in prod by default)
// - Features:EnableDemoCleanup        → background demo cleanup worker
// - Features:EnsureCoreRolesOnStartup → role seeding worker
// -----------------------------
var enableDemoApis = builder.Configuration.GetValue<bool>("Features:EnableDemoApis", builder.Environment.IsDevelopment());
var enableDemoCleanup = builder.Configuration.GetValue<bool>("Features:EnableDemoCleanup", builder.Environment.IsDevelopment());
var ensureCoreRolesOnStartup = builder.Configuration.GetValue<bool>("Features:EnsureCoreRolesOnStartup", builder.Environment.IsDevelopment());

if (enableDemoCleanup)
    builder.Services.AddHostedService<DemoCleanupWorker>();

if (ensureCoreRolesOnStartup)
    builder.Services.AddHostedService<EnsureCoreRolesHostedService>();

// -----------------------------
// CORS (long-term: disabled for same-origin; configurable when split)
// - If Cors:AllowedOrigins is empty or missing → CORS middleware is not added.
// - To enable later, set: Cors:AllowedOrigins = https://your-spa.example.com;https://admin.example.com
// -----------------------------
string? corsAllowed = builder.Configuration["Cors:AllowedOrigins"];
var corsOrigins = (corsAllowed ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var corsEnabled = corsOrigins.Length > 0;

if (corsEnabled)
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(corsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials());
    });
}

// -----------------------------
// EF Core + Azure SQL (Managed Identity) hardening
// -----------------------------
builder.Services.AddDbContextPool<ApplicationDbContext>(options =>
{
    var raw = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
    var csb = new SqlConnectionStringBuilder(raw);

    // Tolerate serverless cold starts & reduce pooled-connection contention
    if (csb.ConnectTimeout < 60) csb.ConnectTimeout = 60;
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
            sql.CommandTimeout(60);
        });
});

var app = builder.Build();

// -----------------------------
// One-time prod migrations gate
// Toggle via Data__RunMigrationsOnStartup=true (keep OFF normally)
// -----------------------------
if (!app.Environment.IsDevelopment() &&
    app.Configuration.GetValue<bool>("Data:RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
    app.Logger.LogInformation("Applied EF Core migrations at startup (Production).");
}

// Visibility for ops
app.Logger.LogInformation(
    "RateLimits → Demo: window={DemoWindow}s, startLimit={DemoLimit}; Auth: window={AuthWindow}s, authLimit={AuthLimit}",
    demoRate.WindowSeconds, demoStartLimit, authRate.WindowSeconds, authLimit);

// -----------------------------
// Dev-only helpers
// -----------------------------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var _ = scope.ServiceProvider;

    app.ApplyMigrations();

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

if (corsEnabled)
    app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

// -----------------------------
// Health check (retry DB via EF execution strategy)
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

// If Demo APIs are disabled, short-circuit them with 404.
// (Keeps code in repo but invisible in prod unless explicitly enabled.)
if (!enableDemoApis)
{
    app.Map("/api/demo/{**rest}", () => Results.NotFound());
}

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    public partial class Program { }
}
