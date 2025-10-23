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
using BetterSchedule.Server.Startup; // NEW: role bootstrapper
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------
// MVC / JSON
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
    {
        c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
    }
});

// -----------------------------
// Core services
// -----------------------------
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection("Features"));

// Demo options + services
builder.Services.Configure<DemoOptions>(builder.Configuration.GetSection("Demo"));
builder.Services.AddScoped<ISandboxService, SandboxService>();
builder.Services.AddHostedService<DemoCleanupWorker>();
builder.Services.AddScoped<IDemoSandboxSeeder, DemoSandboxSeeder>();
builder.Services.AddScoped<DemoSandboxSeeder>();
builder.Services.AddMemoryCache();

// Rate-limit options (bound from config)
builder.Services.Configure<DemoRateLimitOptions>(builder.Configuration.GetSection("Demo:RateLimit"));
builder.Services.Configure<AuthRateLimitOptions>(builder.Configuration.GetSection("Auth:RateLimit"));

var demoRate = builder.Configuration.GetSection("Demo:RateLimit").Get<DemoRateLimitOptions>() ?? new DemoRateLimitOptions();
var authRate = builder.Configuration.GetSection("Auth:RateLimit").Get<AuthRateLimitOptions>() ?? new AuthRateLimitOptions();

var demoWindow = TimeSpan.FromSeconds(Math.Max(1, demoRate.WindowSeconds));
var demoStartLimit = Math.Max(1, demoRate.MaxStartsPerIp);

var authWindow = TimeSpan.FromSeconds(Math.Max(1, authRate.WindowSeconds));
var authLimit = Math.Max(1, authRate.MaxRequestsPerIp);

// -----------------------------
// HTTPS + HSTS
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
// Built-in Rate Limiting
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
            context.HttpContext.Response.Headers["Retry-After"] =
                retryAfterSeconds.ToString(CultureInfo.InvariantCulture);
        }

        var payload = new { error = "rate_limited", retryAfterSeconds };
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(payload, cancellationToken: token);
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
                PermitLimit = demoStartLimit, // split later if desired
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
// AuthN / AuthZ
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

// Ensure core roles exist even without the old dev seeder
builder.Services.AddHostedService<EnsureCoreRolesHostedService>();

// -----------------------------
// CORS
// -----------------------------
builder.Services.AddCors(options =>
{
    var clientUrl = builder.Configuration["App:ClientUrl"] ?? "http://localhost:5173";
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(clientUrl).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// -----------------------------
// EF Core
// -----------------------------
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Log rate limits
app.Logger.LogInformation(
    "RateLimits → Demo: window={DemoWindow}s, startLimit={DemoLimit}; Auth: window={AuthWindow}s, authLimit={AuthLimit}",
    demoRate.WindowSeconds, demoStartLimit, authRate.WindowSeconds, authLimit);

// -----------------------------
// Dev-only
// -----------------------------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    app.ApplyMigrations();

    app.UseSwagger();
    app.UseSwaggerUI();
}

// -----------------------------
// Pipeline (ORDER MATTERS)
// -----------------------------
app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    public partial class Program { }
}
