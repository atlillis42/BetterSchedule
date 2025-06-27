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

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    
    await IdentitySeeder.SeedDataAsync(scope.ServiceProvider);

    // Universal dev login (all roles)
    app.MapPost("/api/dev/login", async (HttpContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var user = await userManager.FindByEmailAsync("admin@dev.local");
        if (user == null)
        {
            return Results.NotFound("Developer user not found.");
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as dev user with all roles");
    });

    // Login as ServiceProvider only
    app.MapPost("/api/dev/login/serviceprovider", async (HttpContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var email = "provider@dev.local";
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            await userManager.CreateAsync(user, "Devpass123!");
            await userManager.AddToRoleAsync(user, "ServiceProvider");
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Service Provider");
    });

    // Login as Client only
    app.MapPost("/api/dev/login/client", async (HttpContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var email = "client@dev.local";
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            await userManager.CreateAsync(user, "Devpass123!");
            await userManager.AddToRoleAsync(user, "Client");
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Client");
    });

    // Hybrid login: ServiceProvider + Client
    app.MapPost("/api/dev/login/hybrid", async (HttpContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager) =>
    {
        var email = "hybrid@dev.local";
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            await userManager.CreateAsync(user, "Devpass123!");
            await userManager.AddToRoleAsync(user, "ServiceProvider");
            await userManager.AddToRoleAsync(user, "Client");
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok("Signed in as Hybrid (ServiceProvider + Client)");
    });


    app.UseSwagger();
    app.UseSwaggerUI();

    app.ApplyMigrations(); // Apply migrations in development mode
}

app.UseHttpsRedirection();

app.MapIdentityApi<ApplicationUser>();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();


namespace BetterSchedule.Server // Adds dummy namespace to avoid compilation issues with ASP.NET tests
{
    public partial class Program { }
}