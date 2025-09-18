using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.DevTools.Seeding; 
using BetterSchedule.Server.Extensions;
using BetterSchedule.Server.Extensions.Json.Converters;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Scheduling;
using BetterSchedule.Server.Services.Time;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Reflection;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// MVC + enum-as-string JSON
builder.Services.AddControllers().AddJsonOptions(o =>
{
    // Enums as strings (e.g., DayOfWeek, CalendarShadingMode, etc.)
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());

    // Strongly-typed TimeSpan/DateOnly with readable wire formats
    o.JsonSerializerOptions.Converters.Add(new TimeSpanJsonConverter());   // "HH:mm:ss"
    o.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());   // "yyyy-MM-dd"
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

builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

// AuthN/AuthZ
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
    options.Cookie.SameSite = SameSiteMode.None;                 // cross-site SPA
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;     // requires HTTPS on SPA origin

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

// Ensure org_id claim is minted
builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, CustomClaimsPrincipalFactory>();

builder.Services.AddScoped<ISchedulingConflictService, SchedulingConflictService>();

// CORS: use HTTPS SPA origin so secure cookies can flow
builder.Services.AddCors(options =>
{
    var clientUrl = builder.Configuration["App:ClientUrl"] ?? "https://localhost:5173";
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(clientUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// DB
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Seed options binding
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection("Seeding"));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDevDiagnostics();

    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    app.ApplyMigrations();

    var db = services.GetRequiredService<ApplicationDbContext>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var seedOptions = services.GetRequiredService<IOptions<SeedOptions>>().Value;

    // Run tiny Base seed (+ optional scenarios) via SeedRunner
    if (seedOptions.Enabled)
        await SeedRunner.ExecuteAsync(db, userManager, roleManager, seedOptions);

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGroup("/api").MapIdentityApi<ApplicationUser>();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    public partial class Program { }
}
