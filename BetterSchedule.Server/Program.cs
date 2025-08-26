using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.DevTools;
using BetterSchedule.Server.Extensions;
using BetterSchedule.Server.Services.Time;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Scheduling;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Controllers & Swagger
builder.Services.AddControllers().AddJsonOptions(o =>
{
    // Enable "Monday", "Tuesday", etc. string enums for System.DayOfWeek
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Clock
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

// AuthN/Z
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
    options.LoginPath = "/login";
    options.Cookie.Name = ".BetterSchedule.Identity";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None; // SPA cross-site in dev
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
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

// CORS (credentials require explicit origins)
builder.Services.AddCors(options =>
{
    var clientUrl = builder.Configuration["App:ClientUrl"] ?? "http://localhost:5173";
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(clientUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// EF Core
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDevDiagnostics();

    // Apply migrations + seed dev data
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    app.ApplyMigrations();

    var db = services.GetRequiredService<ApplicationDbContext>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    await DbInitializer.SeedAsync(db, userManager, roleManager);

    // Dev login endpoints
    app.MapPost("/api/dev/login", async (UserManager<ApplicationUser> um, SignInManager<ApplicationUser> sm) =>
    {
        var user = await um.FindByEmailAsync("admin@dev.local");
        if (user is null) return Results.NotFound("Developer user not found.");
        await sm.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as dev user with all roles");
    });
    app.MapPost("/api/dev/login/serviceprovider", async (UserManager<ApplicationUser> um, SignInManager<ApplicationUser> sm) =>
    {
        var user = await um.FindByEmailAsync("provider@dev.local");
        if (user is null) return Results.NotFound("Developer ServiceProvider not found.");
        await sm.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Service Provider");
    });
    app.MapPost("/api/dev/login/client", async (UserManager<ApplicationUser> um, SignInManager<ApplicationUser> sm) =>
    {
        var user = await um.FindByEmailAsync("client@dev.local");
        if (user is null) return Results.NotFound("Developer Client not found.");
        await sm.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Client");
    });
    app.MapPost("/api/dev/login/hybrid", async (UserManager<ApplicationUser> um, SignInManager<ApplicationUser> sm) =>
    {
        var user = await um.FindByEmailAsync("hybrid@dev.local");
        if (user is null) return Results.NotFound("Developer hybrid user not found.");
        await sm.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Hybrid (ServiceProvider + Client)");
    });

    app.UseSwagger();
    app.UseSwaggerUI();
}

// Static files 
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapIdentityApi<ApplicationUser>();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

namespace BetterSchedule.Server
{
    public partial class Program { }
}
