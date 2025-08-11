using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Database
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<CalendarResource> CalendarResources { get; set; }
        public DbSet<BlockedTime> BlockedTimes { get; set; }
        public DbSet<Reservation> Reservations { get; set; }
        public DbSet<AppointmentType> AppointmentTypes { get; set; }
        public DbSet<ReservationParticipant> ReservationParticipants { get; set; }
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<ClientOrganization> ClientOrganizations { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.HasDefaultSchema("identity");

            // AppointmentType → Organization
            builder.Entity<AppointmentType>()
                .HasOne<Organization>(at => at.Organization)
                .WithMany()
                .HasForeignKey(at => at.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // AppointmentType: Set decimal precision for Price
            builder.Entity<AppointmentType>()
                .Property(a => a.Price)
                .HasColumnType("decimal(18,2)");

            // ClientOrganization → Client (ApplicationUser)
            builder.Entity<ClientOrganization>()
                .HasOne<ApplicationUser>(co => co.Client)
                .WithMany()
                .HasForeignKey(co => co.ClientId)
                .OnDelete(DeleteBehavior.Cascade);

            // ClientOrganization → Organization
            builder.Entity<ClientOrganization>()
                .HasOne<Organization>(co => co.Organization)
                .WithMany()
                .HasForeignKey(co => co.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            // ClientOrganization: Unique constraint on (ClientId, OrganizationId)
            builder.Entity<ClientOrganization>()
                .HasIndex(co => new { co.ClientId, co.OrganizationId })
                .IsUnique();

            // ReservationParticipant → Reservation
            builder.Entity<ReservationParticipant>()
                .HasOne<Reservation>(rp => rp.Reservation)
                .WithMany(r => r.Participants)
                .HasForeignKey(rp => rp.ReservationId)
                .OnDelete(DeleteBehavior.Restrict);

            // ReservationParticipant → Organization
            builder.Entity<ReservationParticipant>()
                .HasOne<Organization>(rp => rp.Organization)
                .WithMany()
                .HasForeignKey(rp => rp.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → Organization
            builder.Entity<Reservation>()
                .HasOne<Organization>(r => r.Organization)
                .WithMany()
                .HasForeignKey(r => r.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → AppointmentType
            builder.Entity<Reservation>()
                .HasOne<AppointmentType>(r => r.AppointmentType)
                .WithMany()
                .HasForeignKey(r => r.AppointmentTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → Client (ApplicationUser)
            builder.Entity<Reservation>()
                .HasOne<ApplicationUser>(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            // Reservation → ServiceProvider (ApplicationUser)
            builder.Entity<Reservation>()
                .HasOne<ApplicationUser>(r => r.ServiceProvider)
                .WithMany()
                .HasForeignKey(r => r.ServiceProviderId)
                .OnDelete(DeleteBehavior.Restrict); 

            // BlockedTime → Organization
            builder.Entity<BlockedTime>()
                .HasOne<Organization>(bt => bt.Organization)
                .WithMany()
                .HasForeignKey(bt => bt.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // BlockedTime → CalendarResource
            builder.Entity<BlockedTime>()
                .HasOne<CalendarResource>(bt => bt.Resource)
                .WithMany(r => r.BlockedTimes)
                .HasForeignKey(bt => bt.ResourceId)
                .OnDelete(DeleteBehavior.Restrict);

            // CalendarResource → Organization
            builder.Entity<CalendarResource>()
                .HasOne<Organization>(cr => cr.Organization)
                .WithMany()
                .HasForeignKey(cr => cr.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
