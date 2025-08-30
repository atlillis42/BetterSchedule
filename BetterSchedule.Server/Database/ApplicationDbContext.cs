using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;      // AppointmentTypes, Reservations, ReservationParticipants, ProviderAvailability
using BetterSchedule.Server.Models.Tenant;          // Organization, ClientOrganization, OrganizationSettings
using BetterSchedule.Server.Models.Access;
using BetterSchedule.Server.Models.Business;        // Packages, PackageAssignments, PackageRedemptions
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Database
{
    /// <summary>
    /// EF Core context for identity and domain entities.
    /// Configures multi-tenant boundaries, soft-delete/index strategies, and common query indexes.
    /// </summary>
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        // -------------------------
        // Domain sets
        // -------------------------

        /// <summary>Bookable physical/virtual resources like rooms, chairs, equipment.</summary>
        public DbSet<CalendarResource> CalendarResources { get; set; } = default!;

        /// <summary>Ad-hoc blocks that prevent booking for a provider and/or resource.</summary>
        public DbSet<BlockedTime> BlockedTimes { get; set; } = default!;

        /// <summary>Weekly availability rules expressed in local org time.</summary>
        public DbSet<ProviderAvailability> ProviderAvailabilities { get; set; } = default!;

        /// <summary>Scheduled appointments.</summary>
        public DbSet<Reservation> Reservations { get; set; } = default!;

        /// <summary>Catalog of services (duration/price/etc.).</summary>
        public DbSet<AppointmentType> AppointmentTypes { get; set; } = default!;

        /// <summary>Additional participants (guests, extra providers) on a reservation.</summary>
        public DbSet<ReservationParticipant> ReservationParticipants { get; set; } = default!;

        /// <summary>Organizations (tenants).</summary>
        public DbSet<Organization> Organizations { get; set; } = default!;

        /// <summary>Client membership records allowing a user to belong to multiple orgs.</summary>
        public DbSet<ClientOrganization> ClientOrganizations { get; set; } = default!;

        /// <summary>Organization-wide scheduling/booking policy configuration.</summary>
        public DbSet<OrganizationSettings> OrganizationSettings { get; set; } = default!;

        // -------------------------
        // Access control sets
        // -------------------------

        /// <summary>Grants providers access to specific resources (when org policy requires).</summary>
        public DbSet<ProviderResourceAccess> ProviderResourceAccesses { get; set; } = default!;

        /// <summary>Grants providers access to specific appointment types (when org policy requires).</summary>
        public DbSet<ProviderAppointmentTypeAccess> ProviderAppointmentTypeAccesses { get; set; } = default!;

        /// <summary>Restricts which resources may be used with an appointment type.</summary>
        public DbSet<AppointmentTypeResourceAccess> AppointmentTypeResourceAccesses { get; set; } = default!;

        // -------------------------
        // Packages
        // -------------------------

        /// <summary>Sellable “packs” of uses for an appointment type.</summary>
        public DbSet<Package> Packages { get; set; } = default!;

        /// <summary>A client’s entitlement to a package (remaining uses, expiration).</summary>
        public DbSet<PackageAssignment> PackageAssignments { get; set; } = default!;

        /// <summary>Consumption entries linking a reservation to a package assignment.</summary>
        public DbSet<PackageRedemption> PackageRedemptions { get; set; } = default!;

        /// <summary>
        /// Configure identity schemas, relationships, indexes, and uniqueness/soft-delete policies.
        /// </summary>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ----------------------------------------------------------------
            // Identity → explicit schema
            // ----------------------------------------------------------------
            builder.Entity<ApplicationUser>().ToTable("AspNetUsers", "identity");
            builder.Entity<IdentityRole>().ToTable("AspNetRoles", "identity");
            builder.Entity<IdentityUserRole<string>>().ToTable("AspNetUserRoles", "identity");
            builder.Entity<IdentityUserClaim<string>>().ToTable("AspNetUserClaims", "identity");
            builder.Entity<IdentityUserLogin<string>>().ToTable("AspNetUserLogins", "identity");
            builder.Entity<IdentityUserToken<string>>().ToTable("AspNetUserTokens", "identity");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("AspNetRoleClaims", "identity");

            // Helpful org-scoped indexes for users
            builder.Entity<ApplicationUser>()
                .HasIndex(u => u.OrganizationId)
                .HasDatabaseName("IX_Users_OrganizationId");

            builder.Entity<ApplicationUser>()
                .HasIndex(u => new { u.OrganizationId, u.IsDeleted })
                .HasDatabaseName("IX_Users_Org_IsDeleted");

            builder.Entity<ApplicationUser>()
                .Property<bool>("AvailabilityPublic")
                .HasDefaultValue(false);

            // ----------------------------------------------------------------
            // Relationships
            // ----------------------------------------------------------------
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
                .HasOne(bt => bt.CreatedByUserName)
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

            // Reservation → PackageAssignment (nullable FK; restrict)
            builder.Entity<Reservation>()
                .HasOne<PackageAssignment>()
                .WithMany()
                .HasForeignKey(r => r.PackageAssignmentId)
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

            // OrganizationSettings → Organization (1:1)
            builder.Entity<OrganizationSettings>()
                .HasOne(os => os.Organization)
                .WithOne()
                .HasForeignKey<OrganizationSettings>(os => os.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            // ----------------------------------------------------------------
            // Indexes / constraints
            // ----------------------------------------------------------------

            builder.Entity<ClientOrganization>()
                .HasIndex(co => new { co.ClientId, co.OrganizationId })
                .IsUnique();

            builder.Entity<CalendarResource>()
                .HasIndex(r => new { r.OrganizationId, r.Name })
                .IsUnique();

            builder.Entity<AppointmentType>()
                .HasIndex(a => new { a.OrganizationId, a.Name })
                .IsUnique();

            builder.Entity<ReservationParticipant>(b =>
            {
                b.Property(x => x.Role).HasConversion<int>();
                b.HasIndex(x => new { x.ReservationId, x.UserId })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0 AND [UserId] IS NOT NULL");
                b.ToTable(t => t.HasCheckConstraint(
                    "CK_ReservationParticipant_User_Guest_Role",
                    "(([Role] = 2 AND [UserId] IS NULL) OR ([Role] IN (0,1) AND [UserId] IS NOT NULL))"
                ));
            });

            // ProviderAvailability: allow multiple windows per day; prevent identical active duplicates
            builder.Entity<ProviderAvailability>(b =>
            {
                b.HasIndex(pa => new { pa.OrganizationId, pa.ServiceProviderId, pa.DayOfWeek });

                b.HasIndex(pa => new
                {
                    pa.OrganizationId,
                    pa.ServiceProviderId,
                    pa.DayOfWeek,
                    pa.EffectiveFrom,
                    pa.EffectiveTo,
                    pa.StartLocalTime,
                    pa.EndLocalTime
                })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0");
            });

            // Query-speed indexes
            builder.Entity<BlockedTime>()
                .HasIndex(bt => new { bt.OrganizationId, bt.CreatedByUserId });

            builder.Entity<BlockedTime>()
                .HasIndex(bt => new { bt.OrganizationId, bt.ResourceId, bt.StartTime, bt.EndTime });

            builder.Entity<Reservation>()
                .HasIndex(r => new { r.OrganizationId, r.ServiceProviderId, r.StartTime, r.EndTime });

            builder.Entity<Reservation>()
                .HasIndex(r => new { r.OrganizationId, r.PackageAssignmentId });

            builder.Entity<AppointmentType>()
                .HasIndex(a => new { a.OrganizationId, a.CreatedByUserId });

            // Column types / precision
            builder.Entity<AppointmentType>()
                .Property(a => a.Price)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.StartLocalTime)
                .HasColumnType("time");
            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.EndLocalTime)
                .HasColumnType("time");
            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.EffectiveFrom)
                .HasColumnType("date");
            builder.Entity<ProviderAvailability>()
                .Property(pa => pa.EffectiveTo)
                .HasColumnType("date");

            // ----------------------------------------------------------------
            // Access control entities
            // ----------------------------------------------------------------

            builder.Entity<ProviderResourceAccess>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasIndex(x => new { x.OrganizationId, x.UserId });
                e.HasIndex(x => new { x.OrganizationId, x.ResourceId });

                // Filtered unique: at most one ACTIVE link (IsDeleted=0)
                e.HasIndex(x => new { x.OrganizationId, x.UserId, x.ResourceId })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0");

                e.HasOne(x => x.User)
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.Resource)
                    .WithMany()
                    .HasForeignKey(x => x.ResourceId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ProviderAppointmentTypeAccess>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasIndex(x => new { x.OrganizationId, x.UserId });
                e.HasIndex(x => new { x.OrganizationId, x.AppointmentTypeId });

                // Filtered unique: at most one ACTIVE link
                e.HasIndex(x => new { x.OrganizationId, x.UserId, x.AppointmentTypeId })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0");

                e.HasOne(x => x.User)
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.AppointmentType)
                    .WithMany()
                    .HasForeignKey(x => x.AppointmentTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<AppointmentTypeResourceAccess>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasIndex(x => new { x.OrganizationId, x.AppointmentTypeId });
                e.HasIndex(x => new { x.OrganizationId, x.ResourceId });

                // Filtered unique: at most one ACTIVE link
                e.HasIndex(x => new { x.OrganizationId, x.AppointmentTypeId, x.ResourceId })
                 .IsUnique()
                 .HasFilter("[IsDeleted] = 0");

                e.HasOne(x => x.AppointmentType)
                    .WithMany()
                    .HasForeignKey(x => x.AppointmentTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.Resource)
                    .WithMany()
                    .HasForeignKey(x => x.ResourceId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ----------------------------------------------------------------
            // Packages
            // ----------------------------------------------------------------

            builder.Entity<Package>(e =>
            {
                e.HasKey(x => x.Id);

                e.HasOne<Organization>()
                    .WithMany()
                    .HasForeignKey(x => x.OrganizationId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<AppointmentType>()
                    .WithMany()
                    .HasForeignKey(x => x.AppointmentTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Optional provider lock FK
                e.HasOne<ApplicationUser>()
                    .WithMany()
                    .HasForeignKey(x => x.ProviderId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Case-insensitive uniqueness on Name within org (explicit CI collation)
                e.Property(x => x.Name).UseCollation("SQL_Latin1_General_CP1_CI_AS");
                e.HasIndex(x => new { x.OrganizationId, x.Name })
                 .IsUnique()
                 .HasDatabaseName("UX_Packages_Org_Name_CI");

                e.HasIndex(x => new { x.OrganizationId, x.AppointmentTypeId });
                e.HasIndex(x => new { x.OrganizationId, x.IsActive });
            });

            builder.Entity<PackageAssignment>(e =>
            {
                e.HasKey(x => x.Id);

                e.HasOne<Organization>()
                    .WithMany()
                    .HasForeignKey(x => x.OrganizationId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<ApplicationUser>() // client
                    .WithMany()
                    .HasForeignKey(x => x.ClientId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<Package>()
                    .WithMany()
                    .HasForeignKey(x => x.PackageId)
                    .OnDelete(DeleteBehavior.Restrict);
   
                e.HasIndex(x => new { x.OrganizationId, x.ClientId });
                e.HasIndex(x => new { x.OrganizationId, x.ClientId, x.PackageId, x.IsDeleted });
                e.HasIndex(x => x.ExpiresAtUtc);
            });

            builder.Entity<PackageRedemption>(e =>
            {
                e.HasKey(x => x.Id);

                e.HasOne<Organization>()
                    .WithMany()
                    .HasForeignKey(x => x.OrganizationId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<PackageAssignment>()
                    .WithMany()
                    .HasForeignKey(x => x.PackageAssignmentId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne<Reservation>()
                    .WithMany()
                    .HasForeignKey(x => x.ReservationId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Prevent double-consumption on the same reservation
                e.HasIndex(x => new { x.OrganizationId, x.ReservationId }).IsUnique();

                // Fast lookups by assignment for reporting
                e.HasIndex(x => x.PackageAssignmentId);

                // Default to '1' in DB
                e.Property(x => x.Uses).HasDefaultValue(1);
            });
        }
    }
}
