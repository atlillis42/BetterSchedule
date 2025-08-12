using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;      // AppointmentTypes, Reservations, ReservationParticipants, Packages etc.
using BetterSchedule.Server.Models.Tenant;          // Organization, ClientOrganization
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
        public DbSet<Reservation> Reservations { get; set; } = default!;
        public DbSet<AppointmentType> AppointmentTypes { get; set; } = default!;
        public DbSet<ReservationParticipant> ReservationParticipants { get; set; } = default!;
        public DbSet<Organization> Organizations { get; set; } = default!;
        public DbSet<ClientOrganization> ClientOrganizations { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // EXPLICIT IDENTITY SCHEMA           
            builder.Entity<ApplicationUser>().ToTable("AspNetUsers", "identity");
            builder.Entity<IdentityRole>().ToTable("AspNetRoles", "identity");
            builder.Entity<IdentityUserRole<string>>().ToTable("AspNetUserRoles", "identity");
            builder.Entity<IdentityUserClaim<string>>().ToTable("AspNetUserClaims", "identity");
            builder.Entity<IdentityUserLogin<string>>().ToTable("AspNetUserLogins", "identity");
            builder.Entity<IdentityUserToken<string>>().ToTable("AspNetUserTokens", "identity");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("AspNetRoleClaims", "identity");

            // -----------------------------
            // ORGANIZATION RELATIONSHIPS
            // -----------------------------

            // ApplicationUser → Organization (each user belongs to one org)
            // DeleteBehavior.Restrict prevents org delete from cascading into users
            builder.Entity<ApplicationUser>()
                .HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // CalendarResource → Organization
            builder.Entity<CalendarResource>()
                .HasOne(cr => cr.Organization)
                .WithMany() // Organization may not have a Resources collection
                .HasForeignKey(cr => cr.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // BlockedTime → Organization
            builder.Entity<BlockedTime>()
                .HasOne(bt => bt.Organization)
                .WithMany()
                .HasForeignKey(bt => bt.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // BlockedTime → CalendarResource
            builder.Entity<BlockedTime>()
                .HasOne(bt => bt.Resource)
                .WithMany(r => r.BlockedTimes)
                .HasForeignKey(bt => bt.ResourceId)
                .OnDelete(DeleteBehavior.Restrict);

            // AppointmentType → Organization
            builder.Entity<AppointmentType>()
                .HasOne(at => at.Organization)
                .WithMany(o => o.AppointmentTypes)
                .HasForeignKey(at => at.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → Organization
            builder.Entity<Reservation>()
                .HasOne(r => r.Organization)
                .WithMany()
                .HasForeignKey(r => r.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → AppointmentType
            builder.Entity<Reservation>()
                .HasOne(r => r.AppointmentType)
                .WithMany()
                .HasForeignKey(r => r.AppointmentTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → Client (ApplicationUser)
            builder.Entity<Reservation>()
                .HasOne(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → ServiceProvider (ApplicationUser)
            builder.Entity<Reservation>()
                .HasOne(r => r.ServiceProvider)
                .WithMany()
                .HasForeignKey(r => r.ServiceProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            // ReservationParticipant → Reservation
            builder.Entity<ReservationParticipant>()
                .HasOne(rp => rp.Reservation)
                .WithMany(r => r.Participants)
                .HasForeignKey(rp => rp.ReservationId)
                .OnDelete(DeleteBehavior.Restrict);

            // ReservationParticipant → Organization
            builder.Entity<ReservationParticipant>()
                .HasOne(rp => rp.Organization)
                .WithMany()
                .HasForeignKey(rp => rp.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // ClientOrganization → Client (ApplicationUser)
            builder.Entity<ClientOrganization>()
                .HasOne(co => co.Client)
                .WithMany()
                .HasForeignKey(co => co.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            // ClientOrganization → Organization
            builder.Entity<ClientOrganization>()
                .HasOne(co => co.Organization)
                .WithMany()
                .HasForeignKey(co => co.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // -----------------------------
            // INDEXES / CONSTRAINTS
            // -----------------------------

            // Unique constraint on client membership per org
            builder.Entity<ClientOrganization>()
                .HasIndex(co => new { co.ClientId, co.OrganizationId })
                .IsUnique();

            // Per-org uniqueness for names (great guardrails)
            builder.Entity<CalendarResource>()
                .HasIndex(r => new { r.OrganizationId, r.Name })
                .IsUnique();

            builder.Entity<AppointmentType>()
                .HasIndex(a => new { a.OrganizationId, a.Name })
                .IsUnique();

            // -----------------------------
            // COLUMN TYPES / PRECISION
            // -----------------------------

            // AppointmentType.Price → decimal(18,2)
            builder.Entity<AppointmentType>()
                .Property(a => a.Price)
                .HasColumnType("decimal(18,2)");

            // (Optional) Map TimeSpan to 'time' automatically (SQL Server does this implicitly).
            // If you ever need it explicit:
            // builder.Entity<AppointmentType>()
            //     .Property(a => a.Duration)
            //     .HasConversion(
            //         v => v,          // TimeSpan to TimeSpan (SQL 'time')
            //         v => v);
        }
    }
}
