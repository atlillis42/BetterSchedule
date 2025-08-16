using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Database
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        // Domain sets
        public DbSet<CalendarResource> CalendarResources { get; set; } = default!;
        public DbSet<BlockedTime> BlockedTimes { get; set; } = default!;
        public DbSet<ProviderAvailability> ProviderAvailabilities { get; set; } = default!;
        public DbSet<Reservation> Reservations { get; set; } = default!;
        public DbSet<AppointmentType> AppointmentTypes { get; set; } = default!;
        public DbSet<ReservationParticipant> ReservationParticipants { get; set; } = default!;
        public DbSet<Organization> Organizations { get; set; } = default!;
        public DbSet<ClientOrganization> ClientOrganizations { get; set; } = default!;
        public DbSet<OrganizationSettings> OrganizationSettings { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Identity in explicit schema
            builder.Entity<ApplicationUser>().ToTable("AspNetUsers", "identity");
            builder.Entity<IdentityRole>().ToTable("AspNetRoles", "identity");
            builder.Entity<IdentityUserRole<string>>().ToTable("AspNetUserRoles", "identity");
            builder.Entity<IdentityUserClaim<string>>().ToTable("AspNetUserClaims", "identity");
            builder.Entity<IdentityUserLogin<string>>().ToTable("AspNetUserLogins", "identity");
            builder.Entity<IdentityUserToken<string>>().ToTable("AspNetUserTokens", "identity");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("AspNetRoleClaims", "identity");

            // Relationships
            builder.Entity<ApplicationUser>()
                .HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<CalendarResource>()
                .HasOne(cr => cr.Organization)
                .WithMany()
                .HasForeignKey(cr => cr.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<BlockedTime>()
                .HasOne(bt => bt.Organization)
                .WithMany()
                .HasForeignKey(bt => bt.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<BlockedTime>()
                .HasOne(bt => bt.CreatedByUser)
                .WithMany()
                .HasForeignKey(bt => bt.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<BlockedTime>()
                .HasOne(bt => bt.Resource)
                .WithMany(r => r.BlockedTimes)
                .HasForeignKey(bt => bt.ResourceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ProviderAvailability>()
                .HasOne(pa => pa.Organization)
                .WithMany()
                .HasForeignKey(pa => pa.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ProviderAvailability>()
                .HasOne(pa => pa.ServiceProvider)
                .WithMany()
                .HasForeignKey(pa => pa.ServiceProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppointmentType>()
                .HasOne(at => at.Organization)
                .WithMany(o => o.AppointmentTypes)
                .HasForeignKey(at => at.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Reservation>()
                .HasOne(r => r.Organization)
                .WithMany()
                .HasForeignKey(r => r.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Reservation>()
                .HasOne(r => r.AppointmentType)
                .WithMany()
                .HasForeignKey(r => r.AppointmentTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Reservation>()
                .HasOne(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Reservation>()
                .HasOne(r => r.ServiceProvider)
                .WithMany()
                .HasForeignKey(r => r.ServiceProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ReservationParticipant>()
                .HasOne(rp => rp.Reservation)
                .WithMany(r => r.Participants)
                .HasForeignKey(rp => rp.ReservationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ReservationParticipant>()
                .HasOne(rp => rp.Organization)
                .WithMany()
                .HasForeignKey(rp => rp.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ClientOrganization>()
                .HasOne(co => co.Client)
                .WithMany()
                .HasForeignKey(co => co.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ClientOrganization>()
                .HasOne(co => co.Organization)
                .WithMany()
                .HasForeignKey(co => co.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // OrganizationSettings → Organization
            builder.Entity<OrganizationSettings>()
                .HasOne(os => os.Organization)
                .WithOne()
                .HasForeignKey<OrganizationSettings>(os => os.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes / constraints
            builder.Entity<ClientOrganization>()
                .HasIndex(co => new { co.ClientId, co.OrganizationId })
                .IsUnique();

            // OrganizationSettings → Organization (one-to-one)
            builder.Entity<OrganizationSettings>()
                .HasOne(s => s.Organization)
                .WithOne()
                .HasForeignKey<OrganizationSettings>(s => s.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<CalendarResource>()
                .HasIndex(r => new { r.OrganizationId, r.Name })
                .IsUnique();

            builder.Entity<AppointmentType>()
                .HasIndex(a => new { a.OrganizationId, a.Name })
                .IsUnique();

            builder.Entity<ReservationParticipant>(b =>
            {
                // Store enum as int (clarifies check constraint semantics)
                b.Property(x => x.Role).HasConversion<int>();

                // Unique for real users (guests have null UserId)
                b.HasIndex(x => new { x.ReservationId, x.UserId })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0 AND [UserId] IS NOT NULL");

                // Guest must have null UserId; Client/Provider must have non-null
                b.ToTable(t => t.HasCheckConstraint(
                    "CK_ReservationParticipant_User_Guest_Role",
                    "(([Role] = 2 AND [UserId] IS NULL) OR ([Role] IN (0,1) AND [UserId] IS NOT NULL))"
                // Role enum order: 0=Client,1=ServiceProvider,2=Guest
                ));
            });

            // Column types
            builder.Entity<AppointmentType>()
                .Property(a => a.Price)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.StartTime)
                .HasColumnType("time");

            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.EndTime)
                .HasColumnType("time");


            // Query-speed indexes
            builder.Entity<BlockedTime>()
                .HasIndex(bt => new { bt.OrganizationId, bt.CreatedByUserId });

            builder.Entity<BlockedTime>()
                .HasIndex(bt => new { bt.OrganizationId, bt.ResourceId, bt.StartTime, bt.EndTime });

            builder.Entity<ProviderAvailability>()
                .HasIndex(pa => new { pa.OrganizationId, pa.ServiceProviderId, pa.DayOfWeek })
                .IsUnique();

            builder.Entity<ProviderAvailability>()
                .HasIndex(pa => new { pa.OrganizationId, pa.ProviderId, pa.DayOfWeek, pa.StartTime, pa.EndTime });

            builder.Entity<Reservation>()
                .HasIndex(r => new { r.OrganizationId, r.ServiceProviderId, r.StartTime, r.EndTime });

            builder.Entity<AppointmentType>()
                .HasIndex(a => new { a.OrganizationId, a.CreatedByUserId });
        }
    }
}
