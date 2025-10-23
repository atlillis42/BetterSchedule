using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.DevTools;
using BetterSchedule.Server.Extensions;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Options;
using BetterSchedule.Server.Services.Demo;
using BetterSchedule.Server.Services.Scheduling;
using BetterSchedule.Server.Services.Time;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using System.Text.Json.Serialization;

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
builder.Services.Configure<DemoRateLimitOptions>(builder.Configuration.GetSection("Demo").GetSection("RateLimit"));
builder.Services.AddSingleton<IDemoRateLimiter, DemoRateLimiter>();

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
    .AddDefaultTokenProviders()
    .AddApiEndpoints();

builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, CustomClaimsPrincipalFactory>();
builder.Services.AddScoped<ISchedulingConflictService, SchedulingConflictService>();

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

// -----------------------------
// Dev-only: migrations + dev seed + Swagger
// -----------------------------
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    app.ApplyMigrations();

    var db = services.GetRequiredService<ApplicationDbContext>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    await DbInitializer.SeedAsync(db, userManager, roleManager);

    app.UseSwagger();
    app.UseSwaggerUI();
}

// -----------------------------
// Pipeline
// -----------------------------
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Identity API endpoints (login, etc.)
app.MapGroup("/api").MapIdentityApi<ApplicationUser>();

// Controllers + SPA fallback
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    public partial class Program { }
}
