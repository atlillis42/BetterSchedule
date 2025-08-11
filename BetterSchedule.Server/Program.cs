using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.DevTools;
using BetterSchedule.Server.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddAuthorization();
builder.Services.AddAuthentication().AddCookie(IdentityConstants.ApplicationScheme);

builder.Services.AddIdentityCore<ApplicationUser>()
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders()
        .AddApiEndpoints();

builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, CustomClaimsPrincipalFactory>();


builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Allow cookies for authentication
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();


if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope(); // Create Development scope so dev-only tasks share DI lifetime
    var services = scope.ServiceProvider;
    
    app.ApplyMigrations(); // Apply Migrations in development mode


    var db = services.GetRequiredService<ApplicationDbContext>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    await DbInitializer.SeedAsync(db, userManager, roleManager);

    #region Dev Login Points

    // Universal dev login (all roles)
    app.MapPost("/api/dev/login", async (UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var user = await userManager.FindByEmailAsync("admin@dev.local");
        if (user == null)
            return Results.NotFound("Developer user not found.");

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as dev user with all roles");
    });

    // Login as ServiceProvider only
    app.MapPost("/api/dev/login/serviceprovider", async (UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var user = await userManager.FindByEmailAsync("provider@dev.local");
        if (user == null)
            return Results.NotFound("Developer ServiceProvider not found.");

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Service Provider");
    });

    // Login as Client only
    app.MapPost("/api/dev/login/client", async (UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var user = await userManager.FindByEmailAsync("client@dev.local");
        if (user == null)
            return Results.NotFound("Developer Client not found.");

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Client");
    });

    // Hybrid login: ServiceProvider + Client
    app.MapPost("/api/dev/login/hybrid", async (UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var user = await userManager.FindByEmailAsync("hybrid@dev.local");
        if (user == null)
            return Results.NotFound("Developer hybrid user not found.");

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Hybrid (ServiceProvider + Client)");
    });

    #endregion

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapIdentityApi<ApplicationUser>();

app.UseCors(); // Use CORS policy defined above
app.UseAuthentication(); // Authentication before Authorization
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();


namespace BetterSchedule.Server // Adds dummy namespace to avoid compilation issues with ASP.NET tests
{
    public partial class Program { }
}